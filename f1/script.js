const drivers = [
  {
    id: "oscar-piastri",
    name: "Oscar Piastri",
    team: "McLaren",
    points: 366,
    wins: 5,
  },
  {
    id: "lando-norris",
    name: "Lando Norris",
    team: "McLaren",
    points: 390,
    wins: 5,
  },
  {
    id: "max-verstappen",
    name: "Max Verstappen",
    team: "Red Bull Racing",
    points: 341,
    wins: 6,
  },
  {
    id: "george-russell",
    name: "George Russell",
    team: "Mercedes",
    points: 276,
    wins: 2,
  },
  {
    id: "charles-leclerc",
    name: "Charles Leclerc",
    team: "Ferrari",
    points: 214,
    wins: 2,
  },
  {
    id: "lewis-hamilton",
    name: "Lewis Hamilton",
    team: "Ferrari",
    points: 148,
    wins: 1,
  },
];

const races = [
  {
    id: "race-1",
    name: "Las Vegas Grand Prix",
    flag: "🇺🇸",
    circuitMap: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Las_Vegas_Circuit.png.transform/9col/image.png",
    hasSprint: false,
    round: "Round 22",
    date: "Nov 23, 2025",
    circuit: "Las Vegas Strip Circuit",
    blurb: "A neon night race demanding straight-line efficiency and tyre discipline as temperatures plummet on the strip.",
  },
  {
    id: "race-2",
    name: "Qatar Grand Prix",
    flag: "🇶🇦",
    circuitMap: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Qatar_Circuit.png.transform/9col/image.png",
    hasSprint: true,
    round: "Round 23",
    date: "Nov 30, 2025",
    circuit: "Lusail International Circuit",
    blurb: "Losail's sweeping night layout and sprint format put tyre management and aero balance under the floodlights.",
  },
  {
    id: "race-3",
    name: "Abu Dhabi Grand Prix",
    flag: "🇦🇪",
    circuitMap: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Abu_Dhabi_Circuit.png.transform/9col/image.png",
    hasSprint: false,
    round: "Round 24",
    date: "Dec 7, 2025",
    circuit: "Yas Marina Circuit",
    blurb: "Championship decider under Yas Marina's lights—new layout means overtakes down both main straights remain decisive.",
  },
];

const positionPoints = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const sprintPoints = [8, 7, 6, 5, 4, 3, 2, 1];

const scenarioState = new Map();
races.forEach((race) => {
  scenarioState.set(race.id, new Map());
});

function applyLockedResults() {
  races.forEach((race) => {
    if (!race.readOnly || !race.lockedResults) {
      return;
    }

    const raceState = getRaceState(race.id);
    raceState.clear();

    const raceResults = race.lockedResults.race ?? {};
    Object.entries(raceResults).forEach(([driverId, position]) => {
      raceState.set(driverId, position);
    });

    const sprintResults = race.lockedResults.sprint ?? {};
    Object.entries(sprintResults).forEach(([driverId, position]) => {
      raceState.set(getSprintKey(driverId), position);
    });
  });
}

applyLockedResults();

const driverIndex = new Map(drivers.map((driver) => [driver.id, driver]));
const raceIndex = new Map(races.map((race) => [race.id, race]));

const controlsContainer = document.getElementById("race-controls");
const standingsContainer = document.getElementById("standings");
const resetButton = document.getElementById("reset-button");
const feedbackEl = document.getElementById("feedback");

resetButton?.addEventListener("click", () => {
  scenarioState.forEach((raceState) => raceState.clear());
  applyLockedResults();
  renderControls();
  setFeedback("Scenario cleared.", "success");
  renderStandings();
});

function setFeedback(message, status = "info") {
  if (!feedbackEl) {
    return;
  }

  feedbackEl.textContent = message;
  feedbackEl.classList.toggle("feedback--success", status === "success");
  feedbackEl.classList.add("feedback--visible");

  clearTimeout(setFeedback.hideTimer);
  setFeedback.hideTimer = setTimeout(() => {
    feedbackEl.classList.remove("feedback--visible");
  }, 3000);
}

function countAssignments(raceState, type = "race") {
  return Array.from(raceState.entries()).filter(([key, value]) => {
    if (!value) {
      return false;
    }
    const isSprint = key.startsWith("sprint-");
    return type === "race" ? !isSprint : isSprint;
  }).length;
}

function getSprintKey(driverId) {
  return `sprint-${driverId}`;
}

function getRaceState(raceId) {
  if (!scenarioState.has(raceId)) {
    scenarioState.set(raceId, new Map());
  }
  return scenarioState.get(raceId);
}

function getPointsForPosition(position) {
  if (!position) {
    return 0;
  }
  const index = Number(position) - 1;
  return index >= 0 && index < positionPoints.length ? positionPoints[index] : 0;
}

function getSprintPointsForPosition(position) {
  if (!position) {
    return 0;
  }
  const index = Number(position) - 1;
  return index >= 0 && index < sprintPoints.length ? sprintPoints[index] : 0;
}

function renderControls() {
  controlsContainer.innerHTML = "";

  races.forEach((race) => {
    const raceCard = document.createElement("section");
    raceCard.className = "race-card";
    raceCard.dataset.raceId = race.id;
    const isReadOnly = Boolean(race.readOnly);
    if (isReadOnly) {
      raceCard.classList.add("race-card--locked");
    }

    const title = document.createElement("header");
    title.className = "race-card__title";
    const heading = document.createElement("h3");
    const flagSpan = document.createElement("span");
    flagSpan.className = "race-card__flag";
    flagSpan.textContent = race.flag || "";
    flagSpan.setAttribute("aria-label", `Flag of ${race.name}`);
    heading.append(flagSpan, document.createTextNode(` ${race.name}`));
    const status = document.createElement("span");
    status.className = "race-card__status";
    title.append(heading, status);

    const meta = document.createElement("div");
    meta.className = "race-card__meta";
    meta.textContent = `${race.round} • ${race.circuit}`;

    raceCard.append(title, meta);

    if (race.circuitMap) {
      const circuitMapContainer = document.createElement("div");
      circuitMapContainer.className = "race-card__circuit-map";
      const circuitMapImg = document.createElement("img");
      circuitMapImg.src = race.circuitMap;
      circuitMapImg.alt = `${race.circuit} circuit map`;
      circuitMapImg.className = "circuit-map__image";
      circuitMapContainer.append(circuitMapImg);
      raceCard.append(circuitMapContainer);
    }

    if (isReadOnly) {
      const lockedNotice = document.createElement("p");
      lockedNotice.className = "race-card__locked-note";
      lockedNotice.textContent = "Official classification confirmed. This race is read-only.";
      raceCard.append(lockedNotice);
    }

    const table = document.createElement("table");
    table.className = "race-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const driverHeader = document.createElement("th");
    driverHeader.textContent = "Driver";
    headRow.append(driverHeader);

    positionPoints.forEach((points, index) => {
      const positionHeader = document.createElement("th");
      positionHeader.innerHTML = `${index + 1}<span class="position-label">${points} pts`;
      headRow.append(positionHeader);
    });

    const noneHeader = document.createElement("th");
    noneHeader.innerHTML = `DNF<span class="position-label">0 pts</span>`;
    headRow.append(noneHeader);

    thead.append(headRow);

    const tbody = document.createElement("tbody");

    drivers.forEach((driver) => {
      const row = document.createElement("tr");
      const infoCell = document.createElement("td");
      infoCell.innerHTML = `<div>${driver.name}</div><span class="position-label">${driver.team}</span>`;
      row.append(infoCell);

      const raceState = getRaceState(race.id);
      const currentSelection = raceState.get(driver.id) ?? "";

      positionPoints.forEach((_, index) => {
        const position = String(index + 1);
        const cell = document.createElement("td");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = `${race.id}-position-${position}`;
        input.dataset.driverId = driver.id;
        input.dataset.raceId = race.id;
        input.dataset.position = position;
        input.dataset.session = "race";
        input.checked = currentSelection === position;

        if (!isReadOnly) {
          input.addEventListener("change", handleRadioChange);
        }

        cell.append(input);
        row.append(cell);
      });

      const noneCell = document.createElement("td");
      const noneInput = document.createElement("input");
      noneInput.type = "radio";
      noneInput.name = `${race.id}-none-${driver.id}`;
      noneInput.dataset.driverId = driver.id;
      noneInput.dataset.raceId = race.id;
      noneInput.dataset.position = "";
      noneInput.dataset.session = "race";
      noneInput.checked = currentSelection === "";
      if (!isReadOnly) {
        noneInput.addEventListener("change", handleRadioChange);
      }
      noneCell.append(noneInput);
      row.append(noneCell);

      tbody.append(row);
    });

    table.append(thead, tbody);
    raceCard.append(table);

    if (race.hasSprint) {
      const sprintSection = document.createElement("section");
      sprintSection.className = "race-sprint";

      const sprintTitle = document.createElement("h4");
      sprintTitle.className = "race-sprint__title";
      sprintTitle.textContent = "Sprint Classification";

      const sprintTable = document.createElement("table");
      sprintTable.className = "race-table race-table--sprint";

      const sprintHead = document.createElement("thead");
      const sprintHeadRow = document.createElement("tr");
      const sprintDriverHeader = document.createElement("th");
      sprintDriverHeader.textContent = "Driver";
      sprintHeadRow.append(sprintDriverHeader);

      sprintPoints.forEach((points, index) => {
        const positionHeader = document.createElement("th");
        positionHeader.innerHTML = `${index + 1}<span class="position-label">${points} pts`;
        sprintHeadRow.append(positionHeader);
      });

      const sprintNoneHeader = document.createElement("th");
      sprintNoneHeader.innerHTML = `DNF<span class="position-label">0 pts</span>`;
      sprintHeadRow.append(sprintNoneHeader);

      sprintHead.append(sprintHeadRow);

      const sprintBody = document.createElement("tbody");

      drivers.forEach((driver) => {
        const row = document.createElement("tr");
        const infoCell = document.createElement("td");
        infoCell.innerHTML = `<div>${driver.name}</div><span class="position-label">${driver.team}</span>`;
        row.append(infoCell);

        const raceState = getRaceState(race.id);
        const sprintSelection = raceState.get(getSprintKey(driver.id)) ?? "";

        sprintPoints.forEach((_, index) => {
          const position = String(index + 1);
          const cell = document.createElement("td");
          const input = document.createElement("input");
          input.type = "radio";
          input.name = `${race.id}-sprint-${position}`;
          input.dataset.driverId = driver.id;
          input.dataset.raceId = race.id;
          input.dataset.position = position;
          input.dataset.session = "sprint";
          input.checked = sprintSelection === position;

        if (!isReadOnly) {
          input.addEventListener("change", handleSprintChange);
        }

          cell.append(input);
          row.append(cell);
        });

        const noneCell = document.createElement("td");
        const noneInput = document.createElement("input");
        noneInput.type = "radio";
        noneInput.name = `${race.id}-sprint-none-${driver.id}`;
        noneInput.dataset.driverId = driver.id;
        noneInput.dataset.raceId = race.id;
        noneInput.dataset.position = "";
        noneInput.dataset.session = "sprint";
        noneInput.checked = sprintSelection === "";
        if (!isReadOnly) {
          noneInput.addEventListener("change", handleSprintChange);
        }
        noneCell.append(noneInput);
        row.append(noneCell);

        sprintBody.append(row);
      });

      sprintTable.append(sprintHead, sprintBody);
      sprintSection.append(sprintTitle, sprintTable);
      raceCard.append(sprintSection);
    }

    controlsContainer.append(raceCard);

    refreshRaceInputs(race.id);
  });
}

function getOrdinal(position) {
  const number = Number(position);
  if (!number) {
    return "";
  }

  const remainderTen = number % 10;
  const remainderHundred = number % 100;

  if (remainderTen === 1 && remainderHundred !== 11) {
    return `${number}st`;
  }

  if (remainderTen === 2 && remainderHundred !== 12) {
    return `${number}nd`;
  }

  if (remainderTen === 3 && remainderHundred !== 13) {
    return `${number}rd`;
  }

  return `${number}th`;
}

function handleRadioChange(event) {
  const { driverId, raceId, position } = event.target.dataset;
  const raceState = getRaceState(raceId);
  const raceInfo = raceIndex.get(raceId);
  const driverInfo = driverIndex.get(driverId);

  if (!driverInfo || !raceInfo) {
    return;
  }

  if (!position) {
    raceState.delete(driverId);
    refreshRaceInputs(raceId);
    setFeedback(
      `${driverInfo.name} marked as DNF in ${raceInfo.name}.`,
      "success"
    );
    renderStandings();
    return;
  }

  const conflictEntry = Array.from(raceState.entries()).find(
    ([otherKey, assignedPosition]) =>
      !otherKey.startsWith("sprint-") &&
      otherKey !== driverId &&
      assignedPosition === position
  );

  if (conflictEntry) {
    event.target.checked = false;
    const conflictingDriver = driverIndex.get(conflictEntry[0]);
    setFeedback(
      `${raceInfo.name} already has ${getOrdinal(position)} assigned to ${conflictingDriver?.name ?? "another driver"}.`
    );
    refreshRaceInputs(raceId);
    return;
  }

  raceState.set(driverId, position);
  refreshRaceInputs(raceId);
  setFeedback(
    `${driverInfo.name} set to ${getOrdinal(position)} in ${raceInfo.name}.`,
    "success"
  );
  renderStandings();
}

function handleSprintChange(event) {
  const { driverId, raceId, position } = event.target.dataset;
  const raceState = getRaceState(raceId);
  const raceInfo = raceIndex.get(raceId);
  const driverInfo = driverIndex.get(driverId);

  if (!driverInfo || !raceInfo) {
    return;
  }

  const sprintKey = getSprintKey(driverId);

  if (!position) {
    raceState.delete(sprintKey);
    refreshRaceInputs(raceId);
    setFeedback(
      `${driverInfo.name} removed from ${raceInfo.name} sprint results.`,
      "success"
    );
    renderStandings();
    return;
  }

  const conflictEntry = Array.from(raceState.entries()).find(
    ([otherKey, assignedPosition]) =>
      otherKey !== sprintKey && otherKey.startsWith("sprint-") && assignedPosition === position
  );

  if (conflictEntry) {
    event.target.checked = false;
    const conflictingDriver = driverIndex.get(conflictEntry[0].replace("sprint-", ""));
    setFeedback(
      `${raceInfo.name} sprint already has ${getOrdinal(position)} assigned to ${conflictingDriver?.name ?? "another driver"}.`
    );
    refreshRaceInputs(raceId);
    return;
  }

  raceState.set(sprintKey, position);
  refreshRaceInputs(raceId);
  setFeedback(
    `${driverInfo.name} set to ${getOrdinal(position)} in the ${raceInfo.name} sprint.`,
    "success"
  );
  renderStandings();
}

function refreshRaceInputs(raceId) {
  const raceState = getRaceState(raceId);
  const raceInfo = raceIndex.get(raceId);
  const isReadOnly = Boolean(raceInfo?.readOnly);
  const inputs = controlsContainer.querySelectorAll(
    `input[data-race-id="${raceId}"]`
  );

  inputs.forEach((input) => {
    const { driverId, position, session } = input.dataset;
    const stateKey = session === "sprint" ? getSprintKey(driverId) : driverId;
    const assignedPosition = raceState.get(stateKey) ?? "";

    if (position === "") {
      input.checked = assignedPosition === "";
      input.disabled = isReadOnly;
      if (isReadOnly) {
        input.setAttribute("aria-disabled", "true");
        input.tabIndex = -1;
      } else {
        input.removeAttribute("aria-disabled");
        input.tabIndex = 0;
      }
      return;
    }

    input.checked = assignedPosition === position;

    if (isReadOnly) {
      input.disabled = true;
      input.setAttribute("aria-disabled", "true");
      input.tabIndex = -1;
      return;
    }

    const isSprint = session === "sprint";
    const conflict = Array.from(raceState.entries()).some(
      ([key, value]) =>
        value === position &&
        (isSprint ? key.startsWith("sprint-") : !key.startsWith("sprint-")) &&
        key !== stateKey
    );

    input.disabled = conflict;
    if (conflict) {
      input.setAttribute("aria-disabled", "true");
    } else {
      input.removeAttribute("aria-disabled");
    }
  });

  updateRaceStatus(raceId);
}

function updateRaceStatus(raceId) {
  const raceState = getRaceState(raceId);
  const raceCard = controlsContainer.querySelector(
    `.race-card[data-race-id="${raceId}"]`
  );
  const raceInfo = raceIndex.get(raceId);

  if (!raceCard) {
    return;
  }

  const statusEl = raceCard.querySelector(".race-card__status");
  if (!statusEl) {
    return;
  }

  if (raceInfo?.readOnly) {
    statusEl.textContent = "Official result locked";
    return;
  }

  const raceAssignments = countAssignments(raceState, "race");
  const sprintAssignments = countAssignments(raceState, "sprint");
  const raceSummary = `${raceAssignments} of ${drivers.length} race positions assigned`;
  const sprintSummary = sprintAssignments
    ? ` • ${sprintAssignments} sprint slots filled`
    : "";

  statusEl.textContent =
    raceAssignments === 0 && sprintAssignments === 0
      ? "No positions assigned yet"
      : `${raceSummary}${sprintSummary}`;
}

function renderStandings() {
  const adjustableRaces = races.filter((race) => !race.readOnly);
  const adjustableRaceCount = adjustableRaces.length;

  const projectedStandings = drivers
    .map((driver) => {
      let extraPoints = 0;
      let sprintPointsTotal = 0;
      let finishesAssigned = 0;

      adjustableRaces.forEach((race) => {
        const raceState = getRaceState(race.id);
        const selectedPosition = raceState.get(driver.id) ?? "";
        const pointsForRace = getPointsForPosition(selectedPosition);

        if (selectedPosition) {
          finishesAssigned += 1;
        }

        extraPoints += pointsForRace;

        if (race.hasSprint) {
          const sprintPosition = raceState.get(getSprintKey(driver.id)) ?? "";
          sprintPointsTotal += getSprintPointsForPosition(sprintPosition);
        }
      });

      const projectedPoints = driver.points + extraPoints + sprintPointsTotal;
      return {
        ...driver,
        projectedPoints,
        extraPoints,
        sprintPointsTotal,
        finishesAssigned,
      };
    })
    .sort((a, b) => {
      if (b.projectedPoints !== a.projectedPoints) {
        return b.projectedPoints - a.projectedPoints;
      }

      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      return b.points - a.points;
    });

  const table = document.createElement("table");
  table.className = "standings-table";

  const podiumSummary = document.createElement("div");
  podiumSummary.className = "podium-summary";
  podiumSummary.innerHTML = `
    <span class="podium-summary__title">Projected Podium</span>
    <div class="podium-list">
      ${projectedStandings
        .slice(0, 3)
        .map((driver, index) => `
          <div class="podium-list__item podium-list__item--${index + 1}">
            <span class="podium-list__place">${getOrdinal(index + 1)}</span>
            <div class="podium-list__driver">
              <span>${driver.name}</span>
              <span class="podium-list__points">${driver.projectedPoints} pts</span>
            </div>
            <div class="podium-list__meta">
              <span>Team: ${driver.team}</span>
            </div>
          </div>
        `)
        .join("")}
    </div>
  `;

  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Driver</th>
        <th>Team</th>
        <th>Points</th>
        <th>Change</th>
      </tr>
    </thead>
    <tbody>
      ${projectedStandings
        .map(
          (driver, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${driver.name}</td>
              <td>${driver.team}</td>
              <td>${driver.projectedPoints}</td>
              <td>
                ${driver.extraPoints === 0 && driver.sprintPointsTotal === 0
                  ? "—"
                  : `+${driver.extraPoints} GP pts${
                      driver.sprintPointsTotal
                        ? ` • +${driver.sprintPointsTotal} sprint pts`
                        : ""
                    } (${driver.finishesAssigned} of ${adjustableRaceCount} races)`}
              </td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  `;

  standingsContainer.innerHTML = "";
  standingsContainer.append(podiumSummary, table);
}

renderControls();
renderStandings();

races.forEach((race) => {
  const raceState = getRaceState(race.id);
  if (countAssignments(raceState) > 0) {
    setFeedback(
      `${race.name} already has ${countAssignments(raceState)} of ${drivers.length} positions assigned.`,
      "info"
    );
  }
});

