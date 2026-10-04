# -*- coding: utf-8 -*-
# SNIPERFC-AGENT-OK v3.1
"""
================================================================================
  SNIPER FC  AGENT LOCAL v3
================================================================================

  Moteur d'achat/revente FUT pilot par la console web.
  Ce fichier est normalement tlcharg DJ CONFIGUR depuis la console
  (onglet  Connexion    Tlcharger mon launcher ) : tu n'as rien  diter.

  Nouveauts v3
     Stratgies : la console envoie la cible + les filtres  appliquer.
     Rotation A/B : la console alterne les stratgies, l'agent suit.
     Filtres qualit (Or/Argent/Bronze) et position en plus de la raret.
     Snapshots de march : profondeur + prix plancher remonts en continu
      pour mesurer la concurrence de chaque stratgie.
     Dtection des ventes dans la liste des transferts.
     Plancher de crdits, limite d'achats, anti-dump, reprise auto sur crash.

  Lancement manuel :  pip install selenium requests  puis  python fut_agent.py
================================================================================
"""

import os
import platform
import random
import threading
import time

import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

# ====================== CONFIG (injecte automatiquement) ====================
BASE_URL = "http://localhost:3000"
AGENT_KEY = "dev-agent-key"
CHROME_PROFILE = ""      # vide = profil ddi cr dans ce dossier
# =============================================================================

AGENT_VERSION = "3.0"
WEB_APP_URL = "https://www.ea.com/fr-fr/ea-sports-fc/ultimate-team/web-app/"
POLL_INTERVAL = 1.0
HEARTBEAT_EVERY = 4.0
SALES_CHECK_EVERY = 150      # boucles entre deux vrifications des ventes

DEFAULT_ENGINE = {
    "maxIncrement": 16, "refreshMinLoops": 400, "refreshMaxLoops": 500,
    "loopDelayMs": 400, "buyLimit": 0, "floodThreshold": 6,
    "autoRefreshMin": 15, "minCreditsFloor": 0, "status": "running",
}

DEFAULT_STRATEGY = {
    "id": None, "name": "Dfaut", "playerName": "", "playerEnabled": False,
    "buyPrice": 1000, "sellMin": 1100, "sellMax": 1200,
    "rarity": "", "rarityEnabled": False,
    "quality": "Gold", "qualityEnabled": False,
    "position": "", "positionEnabled": False,
}

# Un changement sur ces cls impose de rappliquer les critres (refresh)
FILTER_KEYS = ("id", "playerName", "playerEnabled", "buyPrice", "rarity",
               "rarityEnabled", "quality", "qualityEnabled", "position",
               "positionEnabled")


class SniperAgent:
    def __init__(self):
        self.engine = dict(DEFAULT_ENGINE)
        self.strategy = dict(DEFAULT_STRATEGY)
        self.driver = None

        self.paused = False
        self.stop = False
        self.need_refresh = False
        self.need_restart = False

        self.loops = 0
        self.refresh_count = 0
        self.inc_value = 0
        self.buys = 0
        self.credits_cache = None
        self.known_sold = 0

        self.next_refresh = None
        self.last_time_refresh = time.time()
        self.last_heartbeat = 0.0
        self._last_skip_log = 0.0
        self._lock = threading.Lock()

    # ------------------------------------------------------------------ utils
    def ei(self, key):
        try:
            return int(self.engine.get(key, DEFAULT_ENGINE.get(key, 0)))
        except (TypeError, ValueError):
            return int(DEFAULT_ENGINE.get(key, 0))

    def si(self, key):
        try:
            return int(self.strategy.get(key, DEFAULT_STRATEGY.get(key, 0)) or 0)
        except (TypeError, ValueError):
            return 0

    def ss(self, key):
        v = self.strategy.get(key, DEFAULT_STRATEGY.get(key, ""))
        return str(v) if v is not None else ""

    def sb(self, key):
        return bool(self.strategy.get(key, DEFAULT_STRATEGY.get(key, False)))

    @staticmethod
    def doze(a, b=None):
        time.sleep(a if b is None else random.uniform(a, b))

    def log(self, message, level="info"):
        print(f"[{time.strftime('%H:%M:%S')}] [{level.upper():5}] {message}")
        self.report({"type": "log", "level": level, "message": message})

    # ------------------------------------------------------------------- API
    def report(self, *events):
        try:
            requests.post(
                f"{BASE_URL}/api/agent/report",
                json={"events": list(events)},
                headers={"x-agent-key": AGENT_KEY, "Content-Type": "application/json"},
                timeout=6,
            )
        except Exception:
            pass

    def _poll_loop(self):
        connected = False
        while not self.stop:
            try:
                r = requests.get(
                    f"{BASE_URL}/api/agent/poll",
                    headers={"x-agent-key": AGENT_KEY},
                    timeout=6,
                )
                if r.status_code == 401:
                    if connected or self.loops == 0:
                        self.log("Cl refuse  regnre ton launcher depuis la console.", "error")
                    connected = False
                    self.doze(5.0)
                    continue
                r.raise_for_status()
                data = r.json()

                with self._lock:
                    self.engine.update(data.get("engine") or {})
                    new_strat = data.get("strategy")
                    if new_strat:
                        old = {k: self.strategy.get(k) for k in FILTER_KEYS}
                        self.strategy = {**DEFAULT_STRATEGY, **new_strat}
                        new = {k: self.strategy.get(k) for k in FILTER_KEYS}
                        if connected and old != new and self.driver:
                            self.need_refresh = True
                            self.log(f" Stratgie  {self.strategy.get('name')}   application des critres.")

                    status = str(self.engine.get("status", "running"))
                    if status == "paused":
                        self.paused = True
                    elif status == "running":
                        self.paused = False
                    elif status == "stopped":
                        self.stop = True

                if not connected:
                    connected = True
                    self.log("Console connecte  configuration synchronise.", "ok")

                for cmd in data.get("commands") or []:
                    self._apply_command(cmd)

            except Exception:
                if connected:
                    connected = False
                    self.log("Console injoignable  reconnexion en cours", "warn")
            self.doze(POLL_INTERVAL)

    def _apply_command(self, cmd):
        t = (cmd or {}).get("type")
        if t == "pause":
            self.paused = True
            self.log(" Pause reue.")
        elif t == "resume":
            self.paused = False
            self.log(" Reprise reue.", "ok")
        elif t == "stop":
            self.stop = True
            self.log(" Arrt demand.", "warn")
        elif t in ("refresh_now", "reload_strategy"):
            self.need_refresh = True
        elif t == "restart_driver":
            self.need_restart = True
        elif t == "reset_stats":
            self.loops = self.refresh_count = self.inc_value = self.buys = 0
            self.last_time_refresh = time.time()

    def heartbeat(self, force=False, status=None):
        now = time.time()
        if not force and now - self.last_heartbeat < HEARTBEAT_EVERY:
            return
        self.last_heartbeat = now
        self.report({
            "type": "heartbeat",
            "status": status or ("paused" if self.paused else "running"),
            "credits": self.credits_cache,
            "loops": self.loops,
            "refreshCount": self.refresh_count,
            "incrementValue": self.inc_value,
            "nextRefreshIn": max(0, (self.next_refresh or 0) - self.refresh_count),
            "platform": f"{platform.system()} {platform.release()}",
            "version": AGENT_VERSION,
        })

    # --------------------------------------------------------------- Selenium
    def open_driver(self):
        if self.driver is not None:
            return
        profile = CHROME_PROFILE or os.path.join(os.getcwd(), "sniperfc_chrome_profile")
        options = webdriver.ChromeOptions()
        options.add_argument(f"--user-data-dir={profile}")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--window-size=1440,1000")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        self.driver = webdriver.Chrome(options=options)
        self.driver.get(WEB_APP_URL)
        if not CHROME_PROFILE:
            self.log("Profil Chrome ddi : connecte-toi  ton compte EA dans la fentre ouverte.", "warn")
        self.log("Navigateur ouvert sur la Web App.")
        self.doze(2.0, 3.0)
        self.try_click_login()

    def close_driver(self):
        try:
            if self.driver:
                self.driver.quit()
        except Exception:
            pass
        self.driver = None

    def restart_driver(self):
        self.log("Redmarrage du navigateur", "warn")
        self.close_driver()
        self.doze(2.0, 3.5)
        self.open_driver()
        self.navigate_market()
        self.fill_criteria()
        self.refresh_count = self.inc_value = 0
        self.schedule_next_refresh()

    def try_click_login(self):
        try:
            WebDriverWait(self.driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Login')]"))
            ).click()
            self.log("Bouton Login cliqu.", "ok")
        except TimeoutException:
            pass
        except Exception:
            pass

    def navigate_market(self):
        WebDriverWait(self.driver, 15).until(
            EC.element_to_be_clickable((By.XPATH, "//button[span[text()='Transfers']]"))
        ).click()
        self.doze(0.7, 1.0)
        WebDriverWait(self.driver, 15).until(
            EC.element_to_be_clickable((By.XPATH, "//h1[text()='Search the Transfer Market']"))
        ).click()
        self.doze(0.9, 1.3)

    def _select_dropdown(self, label, value):
        """Ouvre un filtre droulant (Rarity / Quality / Position) et choisit une valeur."""
        try:
            WebDriverWait(self.driver, 6).until(
                EC.presence_of_element_located(
                    (By.XPATH, f"//span[@class='label' and normalize-space(text())='{label}']")
                )
            ).click()
            WebDriverWait(self.driver, 6).until(
                EC.presence_of_element_located(
                    (By.XPATH, f"//li[normalize-space(text())='{value}']")
                )
            ).click()
            self.doze(0.2, 0.4)
            return True
        except Exception:
            self.log(f"Filtre  {label} = {value}  introuvable, ignor.", "warn")
            return False

    def fill_criteria(self):
        if self.sb("playerEnabled") and self.ss("playerName"):
            field = WebDriverWait(self.driver, 8).until(
                EC.presence_of_element_located((By.CLASS_NAME, "ut-text-input-control"))
            )
            field.clear()
            field.send_keys(self.ss("playerName"))
            self.doze(0.9, 1.2)
            WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable(
                    (By.XPATH, "(//ul[contains(@class,'playerResultsList')]//button)[1]")
                )
            ).click()

        if self.sb("qualityEnabled"):
            self._select_dropdown("Quality", self.ss("quality"))
        if self.sb("rarityEnabled") and self.ss("rarity"):
            self._select_dropdown("Rarity", self.ss("rarity"))
        if self.sb("positionEnabled") and self.ss("position"):
            self._select_dropdown("Position", self.ss("position"))

        price = WebDriverWait(self.driver, 8).until(
            EC.presence_of_element_located((
                By.XPATH,
                "(//div[contains(@class,'ut-numeric-input-spinner-control')]"
                "/input[contains(@class,'ut-number-input-control')])[4]",
            ))
        )
        price.clear()
        price.send_keys(str(self.si("buyPrice")))
        self.doze(0.4, 0.6)

        target = self.ss("playerName") if self.sb("playerEnabled") else "march global"
        self.log(f"Critres appliqus : {target}  {self.si('buyPrice'):,} cr [{self.ss('name')}]")

    def click_search(self):
        WebDriverWait(self.driver, 8).until(
            EC.element_to_be_clickable((By.XPATH, "//button[normalize-space(text())='Search']"))
        ).click()

    def go_back(self):
        try:
            WebDriverWait(self.driver, 8).until(
                EC.element_to_be_clickable((By.XPATH, "//button[@class='ut-navigation-button-control']"))
            ).click()
            self.doze(0.05, 0.12)
        except Exception:
            pass

    def increment_min_price(self):
        try:
            if self.inc_value < self.ei("maxIncrement"):
                WebDriverWait(self.driver, 4).until(
                    EC.element_to_be_clickable((By.CLASS_NAME, "increment-value"))
                ).click()
                self.inc_value += 1
            else:
                WebDriverWait(self.driver, 4).until(
                    EC.presence_of_element_located((
                        By.XPATH,
                        "(//div[contains(@class,'ut-numeric-input-spinner-control')]"
                        "/input[contains(@class,'ut-number-input-control')])[1]",
                    ))
                ).clear()
                self.inc_value = 0
        except Exception:
            pass

    def get_credits(self):
        try:
            el = WebDriverWait(self.driver, 2).until(
                EC.presence_of_element_located((By.CLASS_NAME, "view-navbar-currency-coins"))
            )
            self.credits_cache = int(
                el.text.replace("\u202f", "").replace(" ", "").replace(",", "")
            )
        except Exception:
            pass
        return self.credits_cache

    def schedule_next_refresh(self):
        lo, hi = sorted((self.ei("refreshMinLoops"), self.ei("refreshMaxLoops")))
        self.next_refresh = random.randint(max(10, lo), max(10, hi))

    def refresh_page(self):
        try:
            self.driver.refresh()
            self.doze(1.8, 2.6)
            self.try_click_login()
            self.navigate_market()
            self.fill_criteria()
        except Exception as e:
            self.log(f"Erreur pendant le refresh : {e}", "warn")
        self.refresh_count = self.inc_value = 0
        self.last_time_refresh = time.time()
        self.schedule_next_refresh()

    def _throttled(self, message):
        if time.time() - self._last_skip_log > 12:
            self._last_skip_log = time.time()
            self.log(message)

    # ------------------------------------------------------- ventes dtectes
    def check_sales(self):
        """Compte les cartes vendues dans la liste des transferts."""
        try:
            WebDriverWait(self.driver, 6).until(
                EC.element_to_be_clickable((By.XPATH, "//button[span[text()='Transfers']]"))
            ).click()
            self.doze(0.8, 1.2)
            WebDriverWait(self.driver, 6).until(
                EC.element_to_be_clickable((By.XPATH, "//h1[text()='Transfer List']"))
            ).click()
            self.doze(1.0, 1.5)

            sold_items = self.driver.find_elements(
                By.XPATH, "//div[contains(@class,'sectioned-item-list')]"
                          "//li[contains(@class,'listFUTItem') and .//span[contains(@class,'sold')]]"
            )
            total = len(sold_items)
            if total > self.known_sold:
                self.report({"type": "sale", "count": total - self.known_sold})
                self.log(f" {total - self.known_sold} vente(s) dtecte(s).", "sale")
            self.known_sold = total

            try:
                WebDriverWait(self.driver, 4).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[span[text()='Clear Sold']]"))
                ).click()
                self.known_sold = 0
                self.doze(0.5, 0.9)
            except Exception:
                pass
        except Exception:
            pass
        finally:
            try:
                self.navigate_market()
                self.fill_criteria()
                self.refresh_count = self.inc_value = 0
            except Exception:
                self.need_refresh = True

    # ------------------------------------------------------------------ achat
    def buy_cheapest(self):
        try:
            items = WebDriverWait(self.driver, 0.9).until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "li.listFUTItem"))
            )
        except TimeoutException:
            self.report({"type": "snapshot", "strategyId": self.strategy.get("id"),
                         "listingCount": 0, "lowestPrice": None})
            return False

        prices = []
        for item in items:
            try:
                values = item.find_elements(By.XPATH, ".//span[@class='currency-coins value']")
                if len(values) >= 3:
                    prices.append(int(values[2].text.replace(",", "").replace(".", "").strip()))
            except (ValueError, IndexError):
                continue

        if not prices:
            return False

        lowest = min(prices)
        # Photographie du march  alimente les analytics de concurrence
        self.report({"type": "snapshot", "strategyId": self.strategy.get("id"),
                     "listingCount": len(prices), "lowestPrice": lowest})

        if len(prices) >= self.ei("floodThreshold"):
            self.paused = True
            self.report({"type": "market_flood",
                         "message": f" Pause auto : {len(prices)} cartes  {lowest:,} cr  dump suspect."})
            return False

        if lowest > self.si("buyPrice"):
            self._throttled(f"Plancher {lowest:,} cr > max autoris, on attend.")
            return False

        credits = self.get_credits()
        floor = self.ei("minCreditsFloor")
        if credits is not None:
            if credits < lowest:
                self._throttled(f"Crdits insuffisants ({credits:,} cr).")
                return False
            if floor > 0 and credits - lowest < floor:
                self.paused = True
                self.report({"type": "low_credits",
                             "message": f" Pause auto : plancher de {floor:,} cr atteint."})
                return False

        try:
            target = WebDriverWait(self.driver, 3).until(
                EC.element_to_be_clickable((
                    By.XPATH,
                    f"(//span[@class='currency-coins value' and text()='{lowest:,}']"
                    f"/ancestor::li[contains(@class,'listFUTItem')])[1]",
                ))
            )
            target.click()

            WebDriverWait(self.driver, 3).until(
                EC.element_to_be_clickable(
                    (By.CSS_SELECTOR, "button.btn-standard.buyButton.currency-coins")
                )
            ).click()

            try:
                WebDriverWait(self.driver, 2).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[span[text()='Ok']]"))
                ).click()
            except TimeoutException:
                pass

            WebDriverWait(self.driver, 3).until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//button[span[text()='List on Transfer Market']]")
                )
            ).click()
            self.doze(0.2, 0.35)

            for idx, value in ((1, self.si("sellMin")), (2, self.si("sellMax"))):
                box = WebDriverWait(self.driver, 8).until(
                    EC.presence_of_element_located(
                        (By.XPATH, f"(//input[contains(@class,'ut-number-input-control')])[{idx}]")
                    )
                )
                box.send_keys(Keys.CONTROL, "a")
                box.send_keys(Keys.DELETE)
                box.send_keys(str(value))
                self.doze(0.12, 0.25)

            WebDriverWait(self.driver, 8).until(
                EC.element_to_be_clickable((By.XPATH, "//button[text()='List for Transfer']"))
            ).click()
            self.doze(0.2, 0.35)

            self.buys += 1
            player = self.ss("playerName") if self.sb("playerEnabled") else "Carte"
            self.report({
                "type": "purchase",
                "strategyId": self.strategy.get("id"),
                "player": player,
                "buyPrice": lowest,
                "sellMin": self.si("sellMin"),
                "sellMax": self.si("sellMax"),
                "marketDepth": len(prices),
            })
            self.log(f" {player} achet  {lowest:,} cr  relist {self.si('sellMax'):,} cr.", "buy")

            limit = self.ei("buyLimit")
            if limit > 0 and self.buys >= limit:
                self.paused = True
                self.report({"type": "buy_limit",
                             "message": f" Pause auto : limite de {limit} achats atteinte."})
            self.heartbeat(force=True)
            return True
        except TimeoutException:
            return False
        except Exception as e:
            self.log(f"Erreur pendant l'achat : {e}", "warn")
            return False

    # ------------------------------------------------------------------- main
    def run(self):
        threading.Thread(target=self._poll_loop, daemon=True).start()
        self.log(f"Agent v{AGENT_VERSION} dmarr  console : {BASE_URL}")
        self.doze(1.5)  # laisse le premier poll rcuprer la stratgie

        try:
            self.open_driver()
            self.navigate_market()
            self.fill_criteria()
            self.schedule_next_refresh()
        except Exception as e:
            self.log(f"Navigation initiale incomplte : {e}  l'agent retente.", "warn")

        while not self.stop:
            if self.paused:
                self.heartbeat()
                self.doze(1.6, 2.4)
                continue

            try:
                if self.need_restart:
                    self.need_restart = False
                    self.restart_driver()

                due_time = (time.time() - self.last_time_refresh) > self.ei("autoRefreshMin") * 60
                if self.need_refresh or self.refresh_count >= (self.next_refresh or 10**9) or due_time:
                    self.need_refresh = False
                    self.refresh_page()

                if self.loops > 0 and self.loops % SALES_CHECK_EVERY == 0:
                    self.check_sales()

                self.increment_min_price()
                self.click_search()
                self.buy_cheapest()
                self.go_back()
                self.get_credits()

                self.loops += 1
                self.refresh_count += 1
                self.heartbeat()

                delay = max(0.1, self.ei("loopDelayMs") / 1000.0)
                self.doze(delay * 0.8, delay * 1.35)

            except WebDriverException as e:
                msg = (getattr(e, "msg", None) or str(e))[:100]
                self.log(f"Chrome a plant ({msg})  relance.", "error")
                try:
                    self.restart_driver()
                except Exception:
                    self.doze(8.0)
            except Exception as e:
                self.log(f"Erreur dans la boucle : {e}", "warn")
                self.doze(0.9, 1.5)

        self.heartbeat(force=True, status="stopped")
        self.close_driver()
        self.log("Agent arrt proprement.  la prochaine chasse.", "ok")


def main():
    agent = SniperAgent()
    try:
        agent.run()
    except KeyboardInterrupt:
        print("\nInterruption clavier  fermeture")
        agent.stop = True
        agent.heartbeat(force=True, status="stopped")
        agent.close_driver()


if __name__ == "__main__":
    main()
