/* Boardgame Vote
   - Players persist in localStorage
   - Each round: every player can vote once (YES/NO)
   - When all voted: show totals, disable voting
*/

const STORAGE_KEY = "boardgame_vote_state_v1";

const els = {
  addPlayerForm: document.getElementById("addPlayerForm"),
  playerNameInput: document.getElementById("playerNameInput"),
  playersList: document.getElementById("playersList"),
  playersEmptyHint: document.getElementById("playersEmptyHint"),

  roundResetBtn: document.getElementById("roundResetBtn"),
  gameResetBtn: document.getElementById("gameResetBtn"),

  playerSelect: document.getElementById("playerSelect"),
  voteYesBtn: document.getElementById("voteYesBtn"),
  voteNoBtn: document.getElementById("voteNoBtn"),

  yesCount: document.getElementById("yesCount"),
  noCount: document.getElementById("noCount"),
  roundBadge: document.getElementById("roundBadge"),
  progressText: document.getElementById("progressText"),
  resultHint: document.getElementById("resultHint"),
  message: document.getElementById("message"),
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function sanitizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function defaultState() {
  return {
    players: [], // {id, name}
    round: {
      votes: {}, // playerId -> "yes"|"no"
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // minimal validation
    if (!parsed || !Array.isArray(parsed.players) || !parsed.round) return defaultState();
    if (!parsed.round.votes || typeof parsed.round.votes !== "object") parsed.round.votes = {};
    return parsed;
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setMessage(text) {
  els.message.textContent = text || "";
}

function allVoted() {
  if (state.players.length === 0) return false;
  const votedCount = Object.keys(state.round.votes).length;
  return votedCount === state.players.length;
}

function countVotes() {
  let yes = 0;
  let no = 0;
  for (const v of Object.values(state.round.votes)) {
    if (v === "yes") yes++;
    if (v === "no") no++;
  }
  return { yes, no };
}

function renderPlayers() {
  els.playersList.innerHTML = "";

  const hasPlayers = state.players.length > 0;
  els.playersEmptyHint.style.display = hasPlayers ? "none" : "block";

  for (const p of state.players) {
    const li = document.createElement("li");
    li.className = "player";

    const meta = document.createElement("div");
    meta.className = "meta";

    const nameEl = document.createElement("div");
    nameEl.textContent = p.name;

    const voted = state.round.votes[p.id];
    const sub = document.createElement("div");
    sub.className = "muted small";
    sub.textContent = voted ? `Hat abgestimmt: ${voted === "yes" ? "Ja" : "Nein"}` : "Noch nicht abgestimmt";

    meta.appendChild(nameEl);
    meta.appendChild(sub);

    const removeBtn = document.createElement("button");
    removeBtn.className = "secondary";
    removeBtn.type = "button";
    removeBtn.textContent = "Entfernen";
    removeBtn.addEventListener("click", () => removePlayer(p.id));

    li.appendChild(meta);
    li.appendChild(removeBtn);
    els.playersList.appendChild(li);
  }
}

function renderSelect() {
  els.playerSelect.innerHTML = "";

  if (state.players.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "— Keine Spieler —";
    els.playerSelect.appendChild(opt);
    els.playerSelect.disabled = true;
    return;
  }

  els.playerSelect.disabled = false;

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Spieler auswählen…";
  els.playerSelect.appendChild(placeholder);

  for (const p of state.players) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    els.playerSelect.appendChild(opt);
  }
}

function renderRound() {
  const { yes, no } = countVotes();
  els.yesCount.textContent = String(yes);
  els.noCount.textContent = String(no);

  const total = state.players.length;
  const voted = Object.keys(state.round.votes).length;

  if (total === 0) {
    els.roundBadge.textContent = "Warten auf Spieler…";
    els.progressText.textContent = "";
    els.resultHint.textContent = "Bitte zuerst Spieler hinzufügen.";
  } else if (allVoted()) {
    els.roundBadge.textContent = "Runde abgeschlossen";
    els.progressText.textContent = `${voted}/${total} abgestimmt`;
    els.resultHint.textContent = "Alle haben abgestimmt. Du kannst jetzt Round Reset drücken.";
  } else {
    els.roundBadge.textContent = "Runde läuft";
    els.progressText.textContent = `${voted}/${total} abgestimmt`;
    els.resultHint.textContent = "Ergebnis erscheint automatisch, sobald alle Spieler abgestimmt haben.";
  }

  // Voting enabled only if: players exist AND round not finished
  const votingEnabled = total > 0 && !allVoted();
  els.voteYesBtn.disabled = !votingEnabled;
  els.voteNoBtn.disabled = !votingEnabled;

  // Reset buttons
  els.roundResetBtn.disabled = total === 0; // allow anytime if players exist
  els.gameResetBtn.disabled = total === 0 && voted === 0; // still allow if empty? keep enabled? we'll enable always
  els.gameResetBtn.disabled = false;
}

function renderAll() {
  renderPlayers();
  renderSelect();
  renderRound();
  saveState();
}

function addPlayer(nameRaw) {
  const name = sanitizeName(nameRaw);
  if (!name) {
    setMessage("Bitte einen Namen eingeben.");
    return;
  }
  if (name.length > 24) {
    setMessage("Name zu lang (max. 24 Zeichen).");
    return;
  }
  // prevent duplicate names (case-insensitive)
  const lower = name.toLowerCase();
  const exists = state.players.some(p => p.name.toLowerCase() === lower);
  if (exists) {
    setMessage("Dieser Name existiert bereits. Bitte einen anderen Namen wählen.");
    return;
  }

  state.players.push({ id: uid(), name });
  setMessage(`Spieler hinzugefügt: ${name}`);
  els.playerNameInput.value = "";
  renderAll();
}

function removePlayer(playerId) {
  const p = state.players.find(x => x.id === playerId);
  state.players = state.players.filter(x => x.id !== playerId);
  delete state.round.votes[playerId];

  setMessage(p ? `Spieler entfernt: ${p.name}` : "Spieler entfernt.");
  renderAll();
}

function vote(choice) {
  const playerId = els.playerSelect.value;
  if (!playerId) {
    setMessage("Bitte zuerst einen Spieler auswählen.");
    return;
  }

  if (!state.players.some(p => p.id === playerId)) {
    setMessage("Ungültiger Spieler. Bitte neu auswählen.");
    renderAll();
    return;
  }

  if (allVoted()) {
    setMessage("Runde ist bereits abgeschlossen. Bitte Round Reset drücken.");
    return;
  }

  if (state.round.votes[playerId]) {
    setMessage("Dieser Spieler hat in dieser Runde bereits abgestimmt.");
    return;
  }

  state.round.votes[playerId] = choice; // "yes" or "no"
  const pName = state.players.find(p => p.id === playerId)?.name || "Spieler";
  setMessage(`${pName} hat abgestimmt: ${choice === "yes" ? "Ja" : "Nein"}`);

  // Optionally keep selection; user can pick next player
  els.playerSelect.value = "";

  renderAll();
}

function roundReset() {
  state.round.votes = {};
  setMessage("Runde zurückgesetzt. Neue Runde kann starten.");
  renderAll();
}

function gameReset() {
  state = defaultState();
  localStorage.removeItem(STORAGE_KEY);
  setMessage("Spiel zurückgesetzt. Alle Spieler gelöscht.");
  renderAll();
}

/* --- init --- */
let state = loadState();

els.addPlayerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addPlayer(els.playerNameInput.value);
});

els.voteYesBtn.addEventListener("click", () => vote("yes"));
els.voteNoBtn.addEventListener("click", () => vote("no"));
els.roundResetBtn.addEventListener("click", roundReset);
els.gameResetBtn.addEventListener("click", gameReset);

renderAll();
