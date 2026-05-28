/*
 * Calendario del Mundial 2026 (no oficial).
 *
 * Fuentes de datos públicas (sin clave / con CORS), en orden de preferencia:
 *   1) TheSportsDB  -> gratuita, CORS habilitado, clave de prueba pública "3".
 *   2) ESPN (API no documentada) -> respaldo, suele permitir CORS.
 *   3) data/schedule.json -> respaldo local con datos factuales (fechas, sedes,
 *      equipos). Garantiza que la página nunca quede vacía sin red.
 *
 * Nota legal: el calendario son datos factuales (no protegidos por copyright).
 * No se descargan logos, emblemas ni tipografías oficiales. Las banderas se
 * dibujan con emoji Unicode -> cero llamadas a assets.
 */
(function () {
  "use strict";

  // --- Configuración de fuentes -------------------------------------------
  // ID 4429 = FIFA World Cup en TheSportsDB. Temporada del torneo 2026.
  var CONFIG = {
    refreshMs: 60000, // refresco automático cada 60s
    sportsdb: {
      base: "https://www.thesportsdb.com/api/v1/json/3",
      leagueId: "4429",
      season: "2026"
    },
    espn: {
      base: "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"
    },
    local: "data/schedule.json"
  };

  // Estado de la app
  var state = {
    matches: [],
    filter: "all",
    source: null,
    timer: null
  };

  // --- Utilidades ----------------------------------------------------------

  // Convierte un código ISO de país de 2 letras en su emoji de bandera.
  function flagEmoji(code) {
    if (!code || code.length !== 2) return "🏳️";
    var cc = code.toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) return "🏳️";
    return String.fromCodePoint(
      0x1f1e6 + (cc.charCodeAt(0) - 65),
      0x1f1e6 + (cc.charCodeAt(1) - 65)
    );
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function fmtTime(date) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    } catch (e) {
      return date.toTimeString().slice(0, 5);
    }
  }

  function fmtDay(date) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long"
      }).format(date);
    } catch (e) {
      return date.toDateString();
    }
  }

  function localTzAbbr() {
    try {
      var parts = new Intl.DateTimeFormat(undefined, {
        timeZoneName: "short"
      }).formatToParts(new Date());
      var tz = parts.find(function (p) { return p.type === "timeZoneName"; });
      return tz ? tz.value : "";
    } catch (e) {
      return "";
    }
  }

  // Clasifica un partido según su estado y la hora actual.
  function classify(m) {
    if (m.status === "live") return "live";
    if (m.status === "finished") return "finished";
    if (m.status === "upcoming") return "upcoming";
    // Inferir por fecha si la API no fue explícita
    var now = Date.now();
    var t = m.date ? m.date.getTime() : 0;
    if (!t) return "upcoming";
    if (now < t) return "upcoming";
    if (now > t + 2.5 * 3600 * 1000) return "finished";
    return "live";
  }

  // --- Normalizadores por fuente ------------------------------------------

  // TheSportsDB devuelve eventos con strHomeTeam/intHomeScore/dateEvent/strTime…
  function fromSportsDB(json) {
    var events = (json && (json.events || json.results)) || [];
    return events.map(function (e) {
      var iso = isoFromSportsDB(e);
      var date = iso ? new Date(iso) : null;
      var hs = e.intHomeScore, as = e.intAwayScore;
      var status =
        e.strStatus && /FT|Match Finished/i.test(e.strStatus)
          ? "finished"
          : e.strStatus && /1H|2H|HT|LIVE|ET|PEN/i.test(e.strStatus)
          ? "live"
          : null;
      if (status == null && hs != null && hs !== "" && as != null && as !== "")
        status = "finished";
      return {
        id: e.idEvent,
        date: date,
        home: { name: e.strHomeTeam || "Por definir", code: null, score: numOrNull(hs) },
        away: { name: e.strAwayTeam || "Por definir", code: null, score: numOrNull(as) },
        venue: e.strVenue || "",
        round: e.strRound || e.intRound || "",
        status: status
      };
    });
  }

  function isoFromSportsDB(e) {
    if (e.strTimestamp) return e.strTimestamp; // ya viene en UTC ISO
    if (e.dateEvent) {
      var t = e.strTime && e.strTime !== "00:00:00" ? e.strTime : "00:00:00";
      return e.dateEvent + "T" + t + "Z";
    }
    return null;
  }

  // ESPN scoreboard -> events[].competitions[0]
  function fromESPN(json) {
    var events = (json && json.events) || [];
    return events.map(function (ev) {
      var comp = ev.competitions && ev.competitions[0] ? ev.competitions[0] : {};
      var cs = comp.competitors || [];
      var home = cs.find(function (c) { return c.homeAway === "home"; }) || cs[0] || {};
      var away = cs.find(function (c) { return c.homeAway === "away"; }) || cs[1] || {};
      var st = (ev.status && ev.status.type) || {};
      var status = st.state === "in" ? "live" : st.completed ? "finished" : "upcoming";
      return {
        id: ev.id,
        date: ev.date ? new Date(ev.date) : null,
        home: teamFromESPN(home),
        away: teamFromESPN(away),
        venue: (comp.venue && comp.venue.fullName) || "",
        round: (ev.season && ev.season.slug) || "",
        status: status
      };
    });
  }

  function teamFromESPN(c) {
    var t = c.team || {};
    return {
      name: t.shortDisplayName || t.displayName || t.name || "Por definir",
      code: t.abbreviation && t.abbreviation.length === 2 ? t.abbreviation : null,
      score: numOrNull(c.score)
    };
  }

  // Respaldo local (data/schedule.json) — ya viene normalizado, con códigos ISO.
  function fromLocal(json) {
    var arr = (json && json.matches) || [];
    return arr.map(function (m) {
      return {
        id: m.id,
        date: m.kickoffUTC ? new Date(m.kickoffUTC) : null,
        home: { name: m.home, code: m.homeCode || null, score: null },
        away: { name: m.away, code: m.awayCode || null, score: null },
        venue: m.venue || "",
        round: m.round || "",
        status: null
      };
    });
  }

  function numOrNull(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isNaN(n) ? null : n;
  }

  // --- Carga de datos con cadena de respaldos -----------------------------

  function fetchJSON(url) {
    return fetch(url, { mode: "cors", cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function loadData() {
    setState("Cargando partidos…");
    // 1) TheSportsDB: combinamos próximos + últimos resultados para más cobertura.
    var sd = CONFIG.sportsdb;
    var nextUrl = sd.base + "/eventsnextleague.php?id=" + sd.leagueId;
    var pastUrl = sd.base + "/eventspastleague.php?id=" + sd.leagueId;
    var seasonUrl =
      sd.base + "/eventsseason.php?id=" + sd.leagueId + "&s=" + sd.season;

    return Promise.allSettled([
      fetchJSON(seasonUrl),
      fetchJSON(nextUrl),
      fetchJSON(pastUrl)
    ])
      .then(function (res) {
        var merged = mergeById(
          res
            .filter(function (r) { return r.status === "fulfilled"; })
            .map(function (r) { return fromSportsDB(r.value); })
        );
        if (merged.length) {
          state.source = "TheSportsDB (público)";
          return merged;
        }
        throw new Error("Sin datos de TheSportsDB");
      })
      .catch(function () {
        // 2) ESPN
        return fetchJSON(CONFIG.espn.base).then(function (j) {
          var m = fromESPN(j);
          if (!m.length) throw new Error("Sin datos de ESPN");
          state.source = "ESPN (público)";
          return m;
        });
      })
      .catch(function () {
        // 3) Respaldo local
        return fetchJSON(CONFIG.local).then(function (j) {
          state.source = "Datos locales (respaldo)";
          return fromLocal(j);
        });
      });
  }

  function mergeById(lists) {
    var map = {};
    lists.forEach(function (list) {
      list.forEach(function (m) {
        var key = m.id || (m.home.name + "|" + m.away.name + "|" + (m.date && m.date.getTime()));
        // Preferimos el registro con marcador / estado más informativo
        if (!map[key] || isMoreInformative(m, map[key])) map[key] = m;
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function isMoreInformative(a, b) {
    var sa = a.home.score != null || a.status === "finished" || a.status === "live";
    var sb = b.home.score != null || b.status === "finished" || b.status === "live";
    return sa && !sb;
  }

  // --- Renderizado ---------------------------------------------------------

  function render() {
    var container = document.getElementById("matches");
    container.innerHTML = "";

    var tz = localTzAbbr();
    var items = state.matches
      .filter(function (m) { return m.date instanceof Date && !isNaN(m.date); })
      .sort(function (a, b) { return a.date - b.date; })
      .filter(function (m) {
        if (state.filter === "all") return true;
        return classify(m) === state.filter;
      });

    if (!items.length) {
      setState(
        state.matches.length
          ? "No hay partidos en esta categoría todavía."
          : "Aún no hay partidos disponibles. Vuelve a intentar más tarde."
      );
      return;
    }
    setState("");

    var lastDay = null;
    var group = null;
    items.forEach(function (m) {
      var dayKey = m.date.toISOString().slice(0, 10);
      if (dayKey !== lastDay) {
        lastDay = dayKey;
        group = el("div", "day-group");
        group.appendChild(el("h3", "day-heading", fmtDay(m.date)));
        container.appendChild(group);
      }
      group.appendChild(matchCard(m, tz));
    });
  }

  function matchCard(m, tz) {
    var kind = classify(m);
    var card = el("article", "match");

    var time = el("div", "match-time");
    time.appendChild(el("span", "hh", fmtTime(m.date)));
    if (tz) time.appendChild(el("span", "tz", tz));
    card.appendChild(time);

    var teams = el("div", "match-teams");
    teams.appendChild(teamRow(m.home, m.away, kind));
    teams.appendChild(teamRow(m.away, m.home, kind));
    card.appendChild(teams);

    var meta = el("div", "match-meta");
    var badge = el("span", "badge " + kind,
      kind === "live" ? "● EN VIVO" : kind === "finished" ? "Final" : "Programado");
    meta.appendChild(badge);
    if (m.venue) meta.appendChild(el("span", "venue", m.venue));
    if (m.round) meta.appendChild(el("span", "round", String(m.round)));
    card.appendChild(meta);

    return card;
  }

  function teamRow(team, opponent, kind) {
    var row = el("div", "team");
    var isWinner =
      kind === "finished" &&
      team.score != null &&
      opponent.score != null &&
      team.score > opponent.score;
    if (isWinner) row.classList.add("winner");
    row.appendChild(el("span", "flag", flagEmoji(team.code)));
    row.appendChild(el("span", "name", team.name));
    if (team.score != null) row.appendChild(el("span", "score", String(team.score)));
    return row;
  }

  function setState(msg, isError) {
    var s = document.getElementById("state");
    s.textContent = msg || "";
    s.classList.toggle("error", !!isError);
  }

  function updateMeta() {
    document.getElementById("source-label").textContent =
      "Fuente: " + (state.source || "—");
    document.getElementById("last-updated").textContent =
      "Actualizado " + fmtTime(new Date());
  }

  // --- Ciclo de vida -------------------------------------------------------

  function refresh(manual) {
    var btn = document.getElementById("refresh-btn");
    if (manual) btn.classList.add("spinning");
    return loadData()
      .then(function (matches) {
        state.matches = matches;
        render();
        updateMeta();
      })
      .catch(function (err) {
        setState("No se pudieron cargar los partidos: " + err.message, true);
      })
      .finally(function () {
        btn.classList.remove("spinning");
      });
  }

  function hasLive() {
    return state.matches.some(function (m) { return classify(m) === "live"; });
  }

  function scheduleNext() {
    clearTimeout(state.timer);
    // Refrescamos más seguido si hay partidos en vivo.
    var interval = hasLive() ? Math.min(CONFIG.refreshMs, 30000) : CONFIG.refreshMs;
    state.timer = setTimeout(function () {
      refresh(false).then(scheduleNext);
    }, interval);
  }

  function bindUI() {
    document.querySelectorAll(".filter").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll(".filter").forEach(function (x) {
          x.classList.remove("is-active");
          x.setAttribute("aria-selected", "false");
        });
        b.classList.add("is-active");
        b.setAttribute("aria-selected", "true");
        state.filter = b.dataset.filter;
        render();
      });
    });
    document.getElementById("refresh-btn").addEventListener("click", function () {
      refresh(true).then(scheduleNext);
    });
    // Pausamos el refresco cuando la pestaña no está visible.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) clearTimeout(state.timer);
      else refresh(false).then(scheduleNext);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindUI();
    refresh(false).then(scheduleNext);
  });
})();
