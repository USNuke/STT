import json
import random
import sys
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from PySide6 import QtCore, QtGui, QtWidgets

CIVS = [
    "Federation",
    "Klingon",
    "Romulan",
    "Cardassian",
    "Ferengi",
    "Dominion",
    "Borg",
    "Andorian",
    "Vulcan",
    "Custom / Other",
]

DEFAULT_SEATS = ["Jason", "Christine", "Jacob"]
PHASES = ["Initiative", "Command", "Building", "Recharge"]


@dataclass
class Empire:
    id: str
    name: str
    civilization: str
    ascendancy_tokens: int
    command_tokens: int
    resources: dict
    starbases: int
    weapon_level: int
    shield_level: int


@dataclass
class Seat:
    id: str
    name: str
    empires: list[Empire] = field(default_factory=list)


@dataclass
class SystemRecord:
    id: str
    name: str
    owner_id: str | None
    nodes: dict


@dataclass
class AppState:
    round_number: int
    phase_index: int
    seats: list[Seat]
    systems: list[SystemRecord]
    initiative_by_round: dict
    log_entries: list[str]
    active_empire_id: str | None


def make_default_state() -> AppState:
    seats: list[Seat] = []
    active_empire_id: str | None = None

    for index, seat_name in enumerate(DEFAULT_SEATS):
        seat_id = str(uuid.uuid4())
        empire_id = str(uuid.uuid4())
        empire = Empire(
            id=empire_id,
            name=f"Empire {chr(65 + index)}",
            civilization=CIVS[index % len(CIVS)],
            ascendancy_tokens=0,
            command_tokens=0,
            resources={"production": 0, "research": 0, "culture": 0, "dollars": 0},
            starbases=0,
            weapon_level=0,
            shield_level=0,
        )
        seats.append(Seat(id=seat_id, name=seat_name, empires=[empire]))
        if active_empire_id is None:
            active_empire_id = empire_id

    return AppState(
        round_number=1,
        phase_index=0,
        seats=seats,
        systems=[],
        initiative_by_round={},
        log_entries=[],
        active_empire_id=active_empire_id,
    )


def state_to_dict(state: AppState) -> dict:
    return {
        "round_number": state.round_number,
        "phase_index": state.phase_index,
        "initiative_by_round": state.initiative_by_round,
        "log_entries": state.log_entries,
        "active_empire_id": state.active_empire_id,
        "seats": [
            {
                "id": seat.id,
                "name": seat.name,
                "empires": [
                    {
                        "id": empire.id,
                        "name": empire.name,
                        "civilization": empire.civilization,
                        "ascendancy_tokens": empire.ascendancy_tokens,
                        "command_tokens": empire.command_tokens,
                        "resources": empire.resources,
                        "starbases": empire.starbases,
                        "weapon_level": empire.weapon_level,
                        "shield_level": empire.shield_level,
                    }
                    for empire in seat.empires
                ],
            }
            for seat in state.seats
        ],
        "systems": [
            {
                "id": system.id,
                "name": system.name,
                "owner_id": system.owner_id,
                "nodes": system.nodes,
            }
            for system in state.systems
        ],
    }


def normalize_empire(data: dict) -> Empire:
    resources = data.get("resources", {})
    return Empire(
        id=data.get("id", str(uuid.uuid4())),
        name=data.get("name", "Empire"),
        civilization=data.get("civilization", "Custom / Other"),
        ascendancy_tokens=int(data.get("ascendancy_tokens", 0)),
        command_tokens=int(data.get("command_tokens", 0)),
        resources={
            "production": int(resources.get("production", 0)),
            "research": int(resources.get("research", 0)),
            "culture": int(resources.get("culture", 0)),
            "dollars": int(resources.get("dollars", 0)),
        },
        starbases=int(data.get("starbases", 0)),
        weapon_level=int(data.get("weapon_level", 0)),
        shield_level=int(data.get("shield_level", 0)),
    )


def dict_to_state(payload: dict) -> AppState:
    seats = []
    for seat_data in payload.get("seats", []):
        empires = [normalize_empire(empire_data) for empire_data in seat_data.get("empires", [])]
        seats.append(
            Seat(
                id=seat_data.get("id", str(uuid.uuid4())),
                name=seat_data.get("name", "Seat"),
                empires=empires,
            )
        )
    systems = []
    for system_data in payload.get("systems", []):
        systems.append(
            SystemRecord(
                id=system_data.get("id", str(uuid.uuid4())),
                name=system_data.get("name", "System"),
                owner_id=system_data.get("owner_id"),
                nodes={
                    "production": int(system_data.get("nodes", {}).get("production", 0)),
                    "research": int(system_data.get("nodes", {}).get("research", 0)),
                    "culture": int(system_data.get("nodes", {}).get("culture", 0)),
                    "control": int(system_data.get("nodes", {}).get("control", 0)),
                },
            )
        )

    active_empire_id = payload.get("active_empire_id")
    return AppState(
        round_number=int(payload.get("round_number", 1)),
        phase_index=int(payload.get("phase_index", 0)) % len(PHASES),
        initiative_by_round=payload.get("initiative_by_round", {}),
        log_entries=payload.get("log_entries", []),
        seats=seats or make_default_state().seats,
        systems=systems,
        active_empire_id=active_empire_id,
    )


def ensure_app_dir() -> Path:
    base_dir = Path(__file__).resolve().parent
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir


def load_state(state_path: Path) -> AppState:
    if state_path.exists():
        return dict_to_state(json.loads(state_path.read_text(encoding="utf-8")))
    return make_default_state()


def save_state(state_path: Path, state: AppState) -> None:
    state_path.write_text(json.dumps(state_to_dict(state), indent=2), encoding="utf-8")


def now_stamp() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


class SystemEditorDialog(QtWidgets.QDialog):
    def __init__(self, parent, system_record: SystemRecord, owner_options: list[tuple[str | None, str]]):
        super().__init__(parent)
        self.setWindowTitle("Edit System")
        self.system_record = system_record
        self.owner_options = owner_options
        layout = QtWidgets.QVBoxLayout(self)

        form = QtWidgets.QFormLayout()
        self.owner_combo = QtWidgets.QComboBox()
        for owner_id, label in owner_options:
            self.owner_combo.addItem(label, owner_id)
        self.owner_combo.setCurrentIndex(0)
        if system_record.owner_id is not None:
            for index in range(self.owner_combo.count()):
                if self.owner_combo.itemData(index) == system_record.owner_id:
                    self.owner_combo.setCurrentIndex(index)
                    break

        self.name_input = QtWidgets.QLineEdit(system_record.name)
        self.production_input = QtWidgets.QSpinBox()
        self.research_input = QtWidgets.QSpinBox()
        self.culture_input = QtWidgets.QSpinBox()
        self.control_input = QtWidgets.QSpinBox()

        for widget in [
            self.production_input,
            self.research_input,
            self.culture_input,
            self.control_input,
        ]:
            widget.setRange(0, 99)

        self.production_input.setValue(system_record.nodes.get("production", 0))
        self.research_input.setValue(system_record.nodes.get("research", 0))
        self.culture_input.setValue(system_record.nodes.get("culture", 0))
        self.control_input.setValue(system_record.nodes.get("control", 0))

        form.addRow("Owner", self.owner_combo)
        form.addRow("System Name", self.name_input)
        form.addRow("Production (P)", self.production_input)
        form.addRow("Research (R)", self.research_input)
        form.addRow("Culture (C)", self.culture_input)
        form.addRow("Control (CTRL)", self.control_input)

        layout.addLayout(form)

        button_row = QtWidgets.QHBoxLayout()
        button_row.addStretch()
        save_button = QtWidgets.QPushButton("Save")
        cancel_button = QtWidgets.QPushButton("Cancel")
        save_button.clicked.connect(self.accept)
        cancel_button.clicked.connect(self.reject)
        button_row.addWidget(save_button)
        button_row.addWidget(cancel_button)
        layout.addLayout(button_row)

    def updated_system(self) -> SystemRecord:
        self.system_record.owner_id = self.owner_combo.currentData()
        self.system_record.name = self.name_input.text().strip() or "System"
        self.system_record.nodes = {
            "production": self.production_input.value(),
            "research": self.research_input.value(),
            "culture": self.culture_input.value(),
            "control": self.control_input.value(),
        }
        return self.system_record


class EmpireEditorDialog(QtWidgets.QDialog):
    def __init__(self, parent, empire: Empire):
        super().__init__(parent)
        self.empire = empire
        self.setWindowTitle("Edit Empire")
        layout = QtWidgets.QVBoxLayout(self)
        form = QtWidgets.QFormLayout()
        self.name_input = QtWidgets.QLineEdit(empire.name)
        self.civ_combo = QtWidgets.QComboBox()
        self.civ_combo.addItems(CIVS)
        if empire.civilization in CIVS:
            self.civ_combo.setCurrentText(empire.civilization)
        form.addRow("Empire Name", self.name_input)
        form.addRow("Civilization", self.civ_combo)
        layout.addLayout(form)

        button_row = QtWidgets.QHBoxLayout()
        button_row.addStretch()
        save_button = QtWidgets.QPushButton("Save")
        cancel_button = QtWidgets.QPushButton("Cancel")
        save_button.clicked.connect(self.accept)
        cancel_button.clicked.connect(self.reject)
        button_row.addWidget(save_button)
        button_row.addWidget(cancel_button)
        layout.addLayout(button_row)

    def apply_changes(self) -> Empire:
        self.empire.name = self.name_input.text().strip() or "Empire"
        self.empire.civilization = self.civ_combo.currentText()
        return self.empire


class EarningsDialog(QtWidgets.QDialog):
    def __init__(self, parent, summary_rows: list[tuple[str, dict]]):
        super().__init__(parent)
        self.setWindowTitle("Production Earnings")
        layout = QtWidgets.QVBoxLayout(self)
        table = QtWidgets.QTableWidget(0, 5)
        table.setHorizontalHeaderLabels(["Empire", "P", "R", "C", "$"])
        table.horizontalHeader().setStretchLastSection(True)
        layout.addWidget(table)

        for empire_name, earnings in summary_rows:
            row = table.rowCount()
            table.insertRow(row)
            table.setItem(row, 0, QtWidgets.QTableWidgetItem(empire_name))
            table.setItem(row, 1, QtWidgets.QTableWidgetItem(str(earnings["production"])))
            table.setItem(row, 2, QtWidgets.QTableWidgetItem(str(earnings["research"])))
            table.setItem(row, 3, QtWidgets.QTableWidgetItem(str(earnings["culture"])))
            table.setItem(row, 4, QtWidgets.QTableWidgetItem(str(earnings["dollars"])))

        button_row = QtWidgets.QHBoxLayout()
        button_row.addStretch()
        apply_button = QtWidgets.QPushButton("Apply")
        cancel_button = QtWidgets.QPushButton("Cancel")
        apply_button.clicked.connect(self.accept)
        cancel_button.clicked.connect(self.reject)
        button_row.addWidget(apply_button)
        button_row.addWidget(cancel_button)
        layout.addLayout(button_row)


class CompanionWindow(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Ascendancy Companion")
        self.resize(1300, 780)
        self.app_dir = ensure_app_dir()
        self.state_path = self.app_dir / "state.json"
        self.state = load_state(self.state_path)

        self.tabs = QtWidgets.QTabWidget()
        self.setCentralWidget(self.tabs)

        self.setup_tab = QtWidgets.QWidget()
        self.play_tab = QtWidgets.QWidget()
        self.log_tab = QtWidgets.QWidget()
        self.tabs.addTab(self.setup_tab, "Setup")
        self.tabs.addTab(self.play_tab, "Play")
        self.tabs.addTab(self.log_tab, "Log / Save")

        self.build_palette()
        self.build_setup_tab()
        self.build_play_tab()
        self.build_log_tab()
        self.refresh_all()

    def build_palette(self) -> None:
        palette = QtGui.QPalette()
        palette.setColor(QtGui.QPalette.Window, QtGui.QColor("#101820"))
        palette.setColor(QtGui.QPalette.WindowText, QtGui.QColor("#e6edf3"))
        palette.setColor(QtGui.QPalette.Base, QtGui.QColor("#0c1116"))
        palette.setColor(QtGui.QPalette.AlternateBase, QtGui.QColor("#16212b"))
        palette.setColor(QtGui.QPalette.Text, QtGui.QColor("#e6edf3"))
        palette.setColor(QtGui.QPalette.Button, QtGui.QColor("#22303c"))
        palette.setColor(QtGui.QPalette.ButtonText, QtGui.QColor("#f9f9f9"))
        palette.setColor(QtGui.QPalette.Highlight, QtGui.QColor("#3fb6ff"))
        palette.setColor(QtGui.QPalette.HighlightedText, QtGui.QColor("#101820"))
        self.setPalette(palette)

    def build_setup_tab(self) -> None:
        layout = QtWidgets.QVBoxLayout(self.setup_tab)
        header = QtWidgets.QLabel("Setup Seats and Starting Empires")
        header.setFont(QtGui.QFont("Segoe UI", 16, QtGui.QFont.Bold))
        layout.addWidget(header)

        self.setup_seat_container = QtWidgets.QWidget()
        self.setup_seat_layout = QtWidgets.QVBoxLayout(self.setup_seat_container)
        layout.addWidget(self.setup_seat_container)

        button_row = QtWidgets.QHBoxLayout()
        self.setup_import_button = QtWidgets.QPushButton("Import JSON")
        self.setup_export_button = QtWidgets.QPushButton("Export JSON")
        self.setup_reset_button = QtWidgets.QPushButton("Reset")
        self.start_game_button = QtWidgets.QPushButton("Start Game")

        self.setup_import_button.clicked.connect(self.import_state)
        self.setup_export_button.clicked.connect(self.export_state)
        self.setup_reset_button.clicked.connect(self.reset_state)
        self.start_game_button.clicked.connect(self.start_game)

        for button in [
            self.setup_import_button,
            self.setup_export_button,
            self.setup_reset_button,
            self.start_game_button,
        ]:
            button_row.addWidget(button)
        button_row.addStretch()
        layout.addLayout(button_row)

    def build_play_tab(self) -> None:
        layout = QtWidgets.QVBoxLayout(self.play_tab)

        self.top_bar = QtWidgets.QFrame()
        self.top_bar.setFrameShape(QtWidgets.QFrame.StyledPanel)
        top_layout = QtWidgets.QHBoxLayout(self.top_bar)

        self.round_label = QtWidgets.QLabel()
        self.round_label.setFont(QtGui.QFont("Segoe UI", 14, QtGui.QFont.Bold))
        self.round_minus_button = QtWidgets.QPushButton("-")
        self.round_plus_button = QtWidgets.QPushButton("+")
        self.next_round_button = QtWidgets.QPushButton("Next Round")
        self.round_minus_button.clicked.connect(lambda: self.adjust_round(-1))
        self.round_plus_button.clicked.connect(lambda: self.adjust_round(1))
        self.next_round_button.clicked.connect(self.next_round)

        self.phase_label = QtWidgets.QLabel()
        self.phase_label.setFont(QtGui.QFont("Segoe UI", 12, QtGui.QFont.Bold))
        self.phase_prev_button = QtWidgets.QPushButton("Prev Phase")
        self.phase_next_button = QtWidgets.QPushButton("Next Phase")
        self.phase_prev_button.clicked.connect(lambda: self.shift_phase(-1))
        self.phase_next_button.clicked.connect(lambda: self.shift_phase(1))

        self.active_empire_combo = QtWidgets.QComboBox()
        self.active_empire_combo.currentIndexChanged.connect(self.set_active_empire)

        top_layout.addWidget(self.round_label)
        top_layout.addWidget(self.round_minus_button)
        top_layout.addWidget(self.round_plus_button)
        top_layout.addWidget(self.next_round_button)
        top_layout.addStretch()
        top_layout.addWidget(self.phase_label)
        top_layout.addWidget(self.phase_prev_button)
        top_layout.addWidget(self.phase_next_button)
        top_layout.addStretch()
        top_layout.addWidget(QtWidgets.QLabel("Active Empire"))
        top_layout.addWidget(self.active_empire_combo)
        layout.addWidget(self.top_bar)

        self.initiative_group = QtWidgets.QGroupBox("Initiative")
        self.initiative_layout = QtWidgets.QVBoxLayout(self.initiative_group)
        layout.addWidget(self.initiative_group)

        self.systems_group = QtWidgets.QGroupBox("Systems")
        self.systems_layout = QtWidgets.QVBoxLayout(self.systems_group)
        layout.addWidget(self.systems_group)

        self.seats_group = QtWidgets.QGroupBox("Seats & Empires")
        self.seats_layout = QtWidgets.QVBoxLayout(self.seats_group)
        layout.addWidget(self.seats_group)

        self.defense_group = QtWidgets.QGroupBox("Defense Strength")
        self.defense_layout = QtWidgets.QVBoxLayout(self.defense_group)
        layout.addWidget(self.defense_group)

    def build_log_tab(self) -> None:
        layout = QtWidgets.QVBoxLayout(self.log_tab)
        header = QtWidgets.QLabel("Session Log")
        header.setFont(QtGui.QFont("Segoe UI", 16, QtGui.QFont.Bold))
        layout.addWidget(header)

        self.log_view = QtWidgets.QListWidget()
        layout.addWidget(self.log_view)

        button_row = QtWidgets.QHBoxLayout()
        self.copy_log_button = QtWidgets.QPushButton("Copy Log")
        self.export_log_button = QtWidgets.QPushButton("Export Log")
        self.log_import_button = QtWidgets.QPushButton("Import JSON")
        self.log_export_button = QtWidgets.QPushButton("Export JSON")
        self.log_reset_button = QtWidgets.QPushButton("Reset")

        self.copy_log_button.clicked.connect(self.copy_log)
        self.export_log_button.clicked.connect(self.export_log)
        self.log_import_button.clicked.connect(self.import_state)
        self.log_export_button.clicked.connect(self.export_state)
        self.log_reset_button.clicked.connect(self.reset_state)

        for button in [
            self.copy_log_button,
            self.export_log_button,
            self.log_import_button,
            self.log_export_button,
            self.log_reset_button,
        ]:
            button_row.addWidget(button)
        button_row.addStretch()
        layout.addLayout(button_row)

    def refresh_all(self) -> None:
        self.refresh_setup()
        self.refresh_play()
        self.refresh_log()

    def refresh_setup(self) -> None:
        for i in reversed(range(self.setup_seat_layout.count())):
            item = self.setup_seat_layout.takeAt(i)
            if item.widget():
                item.widget().deleteLater()

        for seat_index, seat in enumerate(self.state.seats):
            card = QtWidgets.QGroupBox(f"Seat {seat_index + 1}")
            card_layout = QtWidgets.QFormLayout(card)

            name_input = QtWidgets.QLineEdit(seat.name)
            name_input.textChanged.connect(
                lambda text, seat_id=seat.id: self.update_seat_name(seat_id, text)
            )
            card_layout.addRow("Seat Name", name_input)

            empire = seat.empires[0]
            civ_combo = QtWidgets.QComboBox()
            civ_combo.addItems(CIVS)
            civ_combo.setCurrentText(empire.civilization)
            civ_combo.currentTextChanged.connect(
                lambda civ, empire_id=empire.id: self.update_empire_civ(empire_id, civ)
            )
            empire_name_input = QtWidgets.QLineEdit(empire.name)
            empire_name_input.textChanged.connect(
                lambda text, empire_id=empire.id: self.update_empire_name(empire_id, text)
            )

            card_layout.addRow("Starting Civ", civ_combo)
            card_layout.addRow("Empire Name", empire_name_input)
            self.setup_seat_layout.addWidget(card)

        self.setup_seat_layout.addStretch()

    def refresh_play(self) -> None:
        self.round_label.setText(f"Round {self.state.round_number}")
        self.phase_label.setText(f"Phase: {PHASES[self.state.phase_index]}")
        self.update_top_bar_theme()

        self.refresh_active_empire_selector()
        self.refresh_initiative()
        self.refresh_systems()
        self.refresh_seats()
        self.refresh_defense()

    def refresh_active_empire_selector(self) -> None:
        self.active_empire_combo.blockSignals(True)
        self.active_empire_combo.clear()
        for empire in self.all_empires():
            self.active_empire_combo.addItem(f"{empire.name} ({empire.civilization})", empire.id)
        if self.state.active_empire_id:
            for index in range(self.active_empire_combo.count()):
                if self.active_empire_combo.itemData(index) == self.state.active_empire_id:
                    self.active_empire_combo.setCurrentIndex(index)
                    break
        self.active_empire_combo.blockSignals(False)

    def refresh_initiative(self) -> None:
        for i in reversed(range(self.initiative_layout.count())):
            item = self.initiative_layout.takeAt(i)
            if item.widget():
                item.widget().deleteLater()

        form_widget = QtWidgets.QWidget()
        form_layout = QtWidgets.QFormLayout(form_widget)
        self.initiative_selectors = []
        rank_choices = ["1", "2", "3"]

        for seat in self.state.seats:
            combo = QtWidgets.QComboBox()
            combo.addItems(rank_choices)
            combo.currentTextChanged.connect(self.ensure_unique_initiative)
            self.initiative_selectors.append(combo)
            form_layout.addRow(seat.name, combo)

        saved_order = self.state.initiative_by_round.get(str(self.state.round_number))
        if saved_order:
            for seat, combo in zip(self.state.seats, self.initiative_selectors):
                if seat.id in saved_order:
                    rank = saved_order.index(seat.id) + 1
                    combo.setCurrentText(str(rank))

        self.initiative_layout.addWidget(form_widget)

        button_row = QtWidgets.QHBoxLayout()
        self.save_initiative_button = QtWidgets.QPushButton("Save Initiative")
        self.random_initiative_button = QtWidgets.QPushButton("Random Initiative")
        self.save_initiative_button.clicked.connect(self.save_initiative)
        self.random_initiative_button.clicked.connect(self.random_initiative)
        button_row.addWidget(self.save_initiative_button)
        button_row.addWidget(self.random_initiative_button)
        self.initiative_display = QtWidgets.QLabel()
        self.initiative_display.setText(self.current_initiative_display())
        button_row.addWidget(self.initiative_display)
        button_row.addStretch()
        self.initiative_layout.addLayout(button_row)

    def refresh_systems(self) -> None:
        for i in reversed(range(self.systems_layout.count())):
            item = self.systems_layout.takeAt(i)
            if item.widget():
                item.widget().deleteLater()

        add_form = QtWidgets.QGroupBox("Add System")
        add_layout = QtWidgets.QFormLayout(add_form)
        self.system_owner_combo = QtWidgets.QComboBox()
        owner_options = self.owner_options()
        for owner_id, label in owner_options:
            self.system_owner_combo.addItem(label, owner_id)
        self.system_name_input = QtWidgets.QLineEdit()
        self.system_prod_input = QtWidgets.QSpinBox()
        self.system_res_input = QtWidgets.QSpinBox()
        self.system_cul_input = QtWidgets.QSpinBox()
        self.system_ctrl_input = QtWidgets.QSpinBox()

        for widget in [
            self.system_prod_input,
            self.system_res_input,
            self.system_cul_input,
            self.system_ctrl_input,
        ]:
            widget.setRange(0, 99)

        add_layout.addRow("Owner", self.system_owner_combo)
        add_layout.addRow("System Name", self.system_name_input)
        add_layout.addRow("Production (P)", self.system_prod_input)
        add_layout.addRow("Research (R)", self.system_res_input)
        add_layout.addRow("Culture (C)", self.system_cul_input)
        add_layout.addRow("Control (CTRL)", self.system_ctrl_input)

        add_button = QtWidgets.QPushButton("Add System")
        add_button.clicked.connect(self.add_system)
        add_layout.addRow(add_button)
        self.systems_layout.addWidget(add_form)

        unowned_group = QtWidgets.QGroupBox("Unowned Systems")
        unowned_layout = QtWidgets.QVBoxLayout(unowned_group)
        unowned_table = QtWidgets.QTableWidget(0, 10)
        unowned_table.setHorizontalHeaderLabels(
            ["Owner", "Name", "P", "R", "C", "CTRL", "Claim", "Claim", "Edit", "Delete"]
        )
        unowned_table.horizontalHeader().setStretchLastSection(True)
        unowned_layout.addWidget(unowned_table)

        unowned_systems = [system for system in self.state.systems if system.owner_id is None]
        for system in unowned_systems:
            row = unowned_table.rowCount()
            unowned_table.insertRow(row)
            unowned_table.setCellWidget(row, 0, self.badge_label("UN", "#8b949e"))
            unowned_table.setItem(row, 1, QtWidgets.QTableWidgetItem(system.name))
            unowned_table.setItem(row, 2, QtWidgets.QTableWidgetItem(str(system.nodes["production"])))
            unowned_table.setItem(row, 3, QtWidgets.QTableWidgetItem(str(system.nodes["research"])))
            unowned_table.setItem(row, 4, QtWidgets.QTableWidgetItem(str(system.nodes["culture"])))
            unowned_table.setItem(row, 5, QtWidgets.QTableWidgetItem(str(system.nodes["control"])))

            claim_combo = QtWidgets.QComboBox()
            for owner_id, label in owner_options[1:]:
                claim_combo.addItem(label, owner_id)
            unowned_table.setCellWidget(row, 6, claim_combo)

            claim_button = QtWidgets.QPushButton("Claim")
            claim_button.clicked.connect(
                lambda checked, sys_id=system.id, combo=claim_combo: self.claim_system(sys_id, combo)
            )
            unowned_table.setCellWidget(row, 7, claim_button)

            edit_button = QtWidgets.QPushButton("Edit")
            edit_button.clicked.connect(lambda checked, sys_id=system.id: self.edit_system(sys_id))
            unowned_table.setCellWidget(row, 8, edit_button)

            delete_button = QtWidgets.QPushButton("Delete")
            delete_button.clicked.connect(lambda checked, sys_id=system.id: self.delete_system(sys_id))
            unowned_table.setCellWidget(row, 9, delete_button)

        self.systems_layout.addWidget(unowned_group)

        owned_group = QtWidgets.QGroupBox("Owned Systems")
        owned_layout = QtWidgets.QVBoxLayout(owned_group)
        for empire in self.all_empires():
            empire_box = QtWidgets.QGroupBox(f"{empire.name} ({empire.civilization})")
            empire_layout = QtWidgets.QVBoxLayout(empire_box)
            table = QtWidgets.QTableWidget(0, 8)
            table.setHorizontalHeaderLabels(["Owner", "Name", "P", "R", "C", "CTRL", "Edit", "Delete"])
            table.horizontalHeader().setStretchLastSection(True)

            systems = [system for system in self.state.systems if system.owner_id == empire.id]
            for system in systems:
                row = table.rowCount()
                table.insertRow(row)
                table.setCellWidget(row, 0, self.owner_badge(empire))
                table.setItem(row, 1, QtWidgets.QTableWidgetItem(system.name))
                table.setItem(row, 2, QtWidgets.QTableWidgetItem(str(system.nodes["production"])))
                table.setItem(row, 3, QtWidgets.QTableWidgetItem(str(system.nodes["research"])))
                table.setItem(row, 4, QtWidgets.QTableWidgetItem(str(system.nodes["culture"])))
                table.setItem(row, 5, QtWidgets.QTableWidgetItem(str(system.nodes["control"])))

                edit_button = QtWidgets.QPushButton("Edit")
                edit_button.clicked.connect(lambda checked, sys_id=system.id: self.edit_system(sys_id))
                table.setCellWidget(row, 6, edit_button)

                delete_button = QtWidgets.QPushButton("Delete")
                delete_button.clicked.connect(lambda checked, sys_id=system.id: self.delete_system(sys_id))
                table.setCellWidget(row, 7, delete_button)

            empire_layout.addWidget(table)
            owned_layout.addWidget(empire_box)
        owned_layout.addStretch()
        self.systems_layout.addWidget(owned_group)

        earnings_button = QtWidgets.QPushButton("Show Earnings")
        earnings_button.clicked.connect(self.show_earnings)
        self.systems_layout.addWidget(earnings_button)

    def refresh_seats(self) -> None:
        for i in reversed(range(self.seats_layout.count())):
            item = self.seats_layout.takeAt(i)
            if item.widget():
                item.widget().deleteLater()

        for seat in self.state.seats:
            seat_box = QtWidgets.QGroupBox(seat.name)
            seat_layout = QtWidgets.QVBoxLayout(seat_box)
            totals = self.seat_totals(seat)
            summary = QtWidgets.QLabel(
                f"Empires: {len(seat.empires)} | Systems: {totals['systems']} | P {totals['production']} / R {totals['research']} / C {totals['culture']} / CTRL {totals['control']}"
            )
            seat_layout.addWidget(summary)

            for empire in seat.empires:
                seat_layout.addWidget(self.empire_card(empire))

            add_empire_button = QtWidgets.QPushButton("+ Add Empire")
            add_empire_button.clicked.connect(lambda checked, seat_id=seat.id: self.add_empire(seat_id))
            seat_layout.addWidget(add_empire_button)
            self.seats_layout.addWidget(seat_box)

        self.seats_layout.addStretch()

    def refresh_defense(self) -> None:
        for i in reversed(range(self.defense_layout.count())):
            item = self.defense_layout.takeAt(i)
            if item.widget():
                item.widget().deleteLater()

        selector_row = QtWidgets.QHBoxLayout()
        selector_row.addWidget(QtWidgets.QLabel("Target Empire"))
        self.defense_empire_combo = QtWidgets.QComboBox()
        for empire in self.all_empires():
            self.defense_empire_combo.addItem(f"{empire.name} ({empire.civilization})", empire.id)
        self.defense_empire_combo.currentIndexChanged.connect(self.update_defense_display)
        selector_row.addWidget(self.defense_empire_combo)
        selector_row.addStretch()
        self.defense_layout.addLayout(selector_row)

        self.defense_value_label = QtWidgets.QLabel()
        self.defense_formula_label = QtWidgets.QLabel()
        self.defense_layout.addWidget(self.defense_value_label)
        self.defense_layout.addWidget(self.defense_formula_label)
        self.update_defense_display()

    def refresh_log(self) -> None:
        self.log_view.clear()
        for entry in self.state.log_entries:
            self.log_view.addItem(entry)

    def update_top_bar_theme(self) -> None:
        empire = self.get_empire(self.state.active_empire_id)
        if empire:
            color = self.civ_color(empire.civilization)
            self.top_bar.setStyleSheet(
                f"QFrame {{ background-color: {color}; border-radius: 6px; }} QLabel {{ color: #101820; }}"
            )
        else:
            self.top_bar.setStyleSheet("")

    def set_active_empire(self) -> None:
        self.state.active_empire_id = self.active_empire_combo.currentData()
        self.log_action("Active empire updated.")
        self.autosave()
        self.refresh_play()

    def update_seat_name(self, seat_id: str, text: str) -> None:
        seat = self.get_seat(seat_id)
        if seat:
            seat.name = text or seat.name
            self.log_action(f"Seat renamed to {seat.name}.")
            self.autosave()
            self.refresh_play()

    def update_empire_name(self, empire_id: str, text: str) -> None:
        empire = self.get_empire(empire_id)
        if empire:
            empire.name = text or empire.name
            self.log_action(f"Empire renamed to {empire.name}.")
            self.autosave()
            self.refresh_play()

    def update_empire_civ(self, empire_id: str, civ: str) -> None:
        empire = self.get_empire(empire_id)
        if empire:
            empire.civilization = civ
            self.log_action(f"Empire civ set to {empire.civilization}.")
            if self.state.active_empire_id == empire.id:
                self.update_top_bar_theme()
            self.autosave()
            self.refresh_play()

    def start_game(self) -> None:
        self.tabs.setCurrentWidget(self.play_tab)
        self.log_action("Game started from setup.")
        self.autosave()

    def adjust_round(self, delta: int) -> None:
        new_value = max(1, self.state.round_number + delta)
        if new_value != self.state.round_number:
            self.state.round_number = new_value
            self.log_action(f"Round set to {self.state.round_number}.")
            self.autosave()
            self.refresh_play()

    def next_round(self) -> None:
        self.state.round_number += 1
        self.state.phase_index = 0
        self.log_action(f"Advanced to round {self.state.round_number}.")
        self.autosave()
        self.refresh_play()

    def shift_phase(self, delta: int) -> None:
        self.state.phase_index = (self.state.phase_index + delta) % len(PHASES)
        self.log_action(f"Phase changed to {PHASES[self.state.phase_index]}.")
        self.autosave()
        self.refresh_play()

    def ensure_unique_initiative(self) -> None:
        selected = [combo.currentText() for combo in self.initiative_selectors]
        for combo in self.initiative_selectors:
            if selected.count(combo.currentText()) > 1:
                combo.setCurrentIndex(0)

    def current_initiative_display(self) -> str:
        order = self.state.initiative_by_round.get(str(self.state.round_number))
        if not order:
            return "Order: not set"
        seat_names = [self.get_seat(seat_id).name for seat_id in order if self.get_seat(seat_id)]
        return "Order: " + " > ".join(seat_names)

    def save_initiative(self) -> None:
        rank_map = {combo.currentText(): seat.id for combo, seat in zip(self.initiative_selectors, self.state.seats)}
        if len(set(rank_map.values())) != len(self.state.seats):
            QtWidgets.QMessageBox.warning(self, "Initiative", "Each seat must have a unique rank.")
            return
        order = [rank_map[str(rank)] for rank in range(1, len(self.state.seats) + 1)]
        self.state.initiative_by_round[str(self.state.round_number)] = order
        self.log_action(f"Initiative saved for round {self.state.round_number}.")
        self.autosave()
        self.refresh_play()

    def random_initiative(self) -> None:
        seat_ids = [seat.id for seat in self.state.seats]
        random.shuffle(seat_ids)
        self.state.initiative_by_round[str(self.state.round_number)] = seat_ids
        first_seat = self.get_seat(seat_ids[0]) if seat_ids else None
        if first_seat and first_seat.empires:
            self.state.active_empire_id = first_seat.empires[0].id
        self.log_action(f"Initiative randomized for round {self.state.round_number}.")
        self.autosave()
        self.refresh_play()

    def add_system(self) -> None:
        name = self.system_name_input.text().strip() or "System"
        system = SystemRecord(
            id=str(uuid.uuid4()),
            name=name,
            owner_id=self.system_owner_combo.currentData(),
            nodes={
                "production": self.system_prod_input.value(),
                "research": self.system_res_input.value(),
                "culture": self.system_cul_input.value(),
                "control": self.system_ctrl_input.value(),
            },
        )
        self.state.systems.append(system)
        self.log_action(f"System added: {system.name}.")
        self.autosave()
        self.refresh_play()
        self.system_name_input.clear()
        for widget in [
            self.system_prod_input,
            self.system_res_input,
            self.system_cul_input,
            self.system_ctrl_input,
        ]:
            widget.setValue(0)

    def claim_system(self, system_id: str, combo: QtWidgets.QComboBox) -> None:
        system = self.get_system(system_id)
        if system:
            system.owner_id = combo.currentData()
            owner = self.get_empire(system.owner_id)
            owner_name = owner.name if owner else "Unknown"
            self.log_action(f"System {system.name} claimed by {owner_name}.")
            self.autosave()
            self.refresh_play()

    def edit_system(self, system_id: str) -> None:
        system = self.get_system(system_id)
        if not system:
            return
        dialog = SystemEditorDialog(self, system, self.owner_options())
        if dialog.exec() == QtWidgets.QDialog.Accepted:
            dialog.updated_system()
            self.log_action(f"System edited: {system.name}.")
            self.autosave()
            self.refresh_play()

    def delete_system(self, system_id: str) -> None:
        system = self.get_system(system_id)
        if not system:
            return
        self.state.systems = [record for record in self.state.systems if record.id != system_id]
        self.log_action(f"System deleted: {system.name}.")
        self.autosave()
        self.refresh_play()

    def add_empire(self, seat_id: str) -> None:
        seat = self.get_seat(seat_id)
        if not seat:
            return
        empire = Empire(
            id=str(uuid.uuid4()),
            name=f"Empire {len(seat.empires) + 1}",
            civilization=CIVS[0],
            ascendancy_tokens=0,
            command_tokens=0,
            resources={"production": 0, "research": 0, "culture": 0, "dollars": 0},
            starbases=0,
            weapon_level=0,
            shield_level=0,
        )
        seat.empires.append(empire)
        self.log_action(f"Empire added to {seat.name}: {empire.name}.")
        self.autosave()
        self.refresh_play()

    def edit_empire(self, empire_id: str) -> None:
        empire = self.get_empire(empire_id)
        if not empire:
            return
        dialog = EmpireEditorDialog(self, empire)
        if dialog.exec() == QtWidgets.QDialog.Accepted:
            dialog.apply_changes()
            self.log_action(f"Empire edited: {empire.name}.")
            self.autosave()
            self.refresh_play()

    def adjust_token(self, empire_id: str, key: str, delta: int) -> None:
        empire = self.get_empire(empire_id)
        if not empire:
            return
        if key == "ascendancy":
            empire.ascendancy_tokens = max(0, empire.ascendancy_tokens + delta)
        else:
            empire.command_tokens = max(0, empire.command_tokens + delta)
        self.log_action(f"{empire.name} {key} tokens adjusted by {delta}.")
        self.autosave()
        self.refresh_play()

    def adjust_resource(self, empire_id: str, key: str, delta: int) -> None:
        empire = self.get_empire(empire_id)
        if not empire:
            return
        empire.resources[key] = empire.resources.get(key, 0) + delta
        self.log_action(f"{empire.name} {key} adjusted by {delta}.")
        self.autosave()
        self.refresh_play()

    def adjust_stat(self, empire_id: str, key: str, delta: int) -> None:
        empire = self.get_empire(empire_id)
        if not empire:
            return
        current = getattr(empire, key)
        setattr(empire, key, max(0, current + delta))
        self.log_action(f"{empire.name} {key.replace('_', ' ')} adjusted by {delta}.")
        self.autosave()
        self.refresh_play()

    def show_earnings(self) -> None:
        if PHASES[self.state.phase_index] != "Building":
            QtWidgets.QMessageBox.information(self, "Earnings", "Earnings are available in Building phase.")
            return
        summary = []
        for empire in self.all_empires():
            totals = self.empire_totals(empire)
            earnings = {
                "production": totals["production"],
                "research": totals["research"],
                "culture": totals["culture"],
                "dollars": totals["control"],
            }
            summary.append((empire.name, earnings))
        dialog = EarningsDialog(self, summary)
        if dialog.exec() == QtWidgets.QDialog.Accepted:
            for empire_name, earnings in summary:
                empire = self.empire_by_name(empire_name)
                if empire:
                    empire.resources["production"] += earnings["production"]
                    empire.resources["research"] += earnings["research"]
                    empire.resources["culture"] += earnings["culture"]
                    empire.resources["dollars"] += earnings["dollars"]
            self.log_action("Earnings applied.")
            self.autosave()
            self.refresh_play()

    def copy_log(self) -> None:
        QtWidgets.QApplication.clipboard().setText("\n".join(self.state.log_entries))

    def export_log(self) -> None:
        filename, _ = QtWidgets.QFileDialog.getSaveFileName(self, "Export Log", "log.txt", "Text Files (*.txt)")
        if filename:
            Path(filename).write_text("\n".join(self.state.log_entries), encoding="utf-8")

    def import_state(self) -> None:
        filename, _ = QtWidgets.QFileDialog.getOpenFileName(self, "Import JSON", "", "JSON Files (*.json)")
        if filename:
            payload = json.loads(Path(filename).read_text(encoding="utf-8"))
            self.state = dict_to_state(payload)
            if not self.state.active_empire_id and self.all_empires():
                self.state.active_empire_id = self.all_empires()[0].id
            self.log_action("State imported.")
            self.autosave()
            self.refresh_all()

    def export_state(self) -> None:
        filename, _ = QtWidgets.QFileDialog.getSaveFileName(self, "Export JSON", "state.json", "JSON Files (*.json)")
        if filename:
            Path(filename).write_text(json.dumps(state_to_dict(self.state), indent=2), encoding="utf-8")

    def reset_state(self) -> None:
        self.state = make_default_state()
        self.log_action("State reset to default.")
        self.autosave()
        self.refresh_all()

    def autosave(self) -> None:
        save_state(self.state_path, self.state)

    def log_action(self, message: str) -> None:
        self.state.log_entries.append(f"{now_stamp()} - {message}")
        self.refresh_log()

    def owner_options(self) -> list[tuple[str | None, str]]:
        options = [(None, "Unowned")]
        for empire in self.all_empires():
            options.append((empire.id, f"{empire.name} ({empire.civilization})"))
        return options

    def seat_totals(self, seat: Seat) -> dict:
        totals = {"production": 0, "research": 0, "culture": 0, "control": 0, "systems": 0}
        for empire in seat.empires:
            empire_totals = self.empire_totals(empire)
            for key in ["production", "research", "culture", "control"]:
                totals[key] += empire_totals[key]
            totals["systems"] += empire_totals["systems"]
        return totals

    def empire_totals(self, empire: Empire) -> dict:
        totals = {"production": 0, "research": 0, "culture": 0, "control": 0, "systems": 0}
        for system in self.state.systems:
            if system.owner_id == empire.id:
                totals["production"] += system.nodes["production"]
                totals["research"] += system.nodes["research"]
                totals["culture"] += system.nodes["culture"]
                totals["control"] += system.nodes["control"]
                totals["systems"] += 1
        return totals

    def all_empires(self) -> list[Empire]:
        empires = []
        for seat in self.state.seats:
            empires.extend(seat.empires)
        return empires

    def empire_by_name(self, name: str) -> Empire | None:
        for empire in self.all_empires():
            if empire.name == name:
                return empire
        return None

    def get_seat(self, seat_id: str) -> Seat | None:
        for seat in self.state.seats:
            if seat.id == seat_id:
                return seat
        return None

    def get_empire(self, empire_id: str | None) -> Empire | None:
        if not empire_id:
            return None
        for empire in self.all_empires():
            if empire.id == empire_id:
                return empire
        return None

    def get_system(self, system_id: str) -> SystemRecord | None:
        for system in self.state.systems:
            if system.id == system_id:
                return system
        return None

    def civ_color(self, civ: str) -> str:
        mapping = {
            "Federation": "#58a6ff",
            "Klingon": "#f85149",
            "Romulan": "#3fb950",
            "Cardassian": "#d29922",
            "Ferengi": "#f2cc60",
            "Dominion": "#a371f7",
            "Borg": "#7d8590",
            "Andorian": "#1f6feb",
            "Vulcan": "#2ea043",
            "Custom / Other": "#8b949e",
        }
        return mapping.get(civ, "#8b949e")

    def civ_abbreviation(self, civ: str) -> str:
        parts = civ.replace("/", " ").split()
        if len(parts) == 1:
            return civ[:2].upper()
        return "".join(part[0] for part in parts[:2]).upper()

    def badge_label(self, text: str, color: str) -> QtWidgets.QLabel:
        label = QtWidgets.QLabel(text)
        label.setAlignment(QtCore.Qt.AlignCenter)
        label.setStyleSheet(
            f"background-color: {color}; color: #101820; border-radius: 4px; padding: 2px;"
        )
        return label

    def owner_badge(self, empire: Empire) -> QtWidgets.QLabel:
        return self.badge_label(self.civ_abbreviation(empire.civilization), self.civ_color(empire.civilization))

    def empire_card(self, empire: Empire) -> QtWidgets.QWidget:
        card = QtWidgets.QFrame()
        card.setFrameShape(QtWidgets.QFrame.StyledPanel)
        layout = QtWidgets.QVBoxLayout(card)

        header_row = QtWidgets.QHBoxLayout()
        header_row.addWidget(self.owner_badge(empire))
        header_row.addWidget(QtWidgets.QLabel(f"{empire.name} ({empire.civilization})"))
        header_row.addStretch()
        edit_button = QtWidgets.QPushButton("Edit Empire")
        edit_button.clicked.connect(lambda checked, empire_id=empire.id: self.edit_empire(empire_id))
        header_row.addWidget(edit_button)
        layout.addLayout(header_row)

        totals = self.empire_totals(empire)
        totals_label = QtWidgets.QLabel(
            f"Systems: {totals['systems']} | P {totals['production']} / R {totals['research']} / C {totals['culture']} / CTRL {totals['control']}"
        )
        layout.addWidget(totals_label)

        token_row = QtWidgets.QHBoxLayout()
        token_row.addWidget(QtWidgets.QLabel("Ascendancy Tokens"))
        token_row.addWidget(self.adjuster(empire, "ascendancy", True))
        token_row.addWidget(QtWidgets.QLabel("Command Tokens"))
        token_row.addWidget(self.adjuster(empire, "command", True))
        layout.addLayout(token_row)

        resource_row = QtWidgets.QGridLayout()
        resource_row.addWidget(QtWidgets.QLabel("$"), 0, 0)
        resource_row.addWidget(self.adjuster(empire, "dollars", False), 0, 1)
        resource_row.addWidget(QtWidgets.QLabel("P"), 0, 2)
        resource_row.addWidget(self.adjuster(empire, "production", False), 0, 3)
        resource_row.addWidget(QtWidgets.QLabel("R"), 1, 0)
        resource_row.addWidget(self.adjuster(empire, "research", False), 1, 1)
        resource_row.addWidget(QtWidgets.QLabel("C"), 1, 2)
        resource_row.addWidget(self.adjuster(empire, "culture", False), 1, 3)
        layout.addLayout(resource_row)

        stat_row = QtWidgets.QGridLayout()
        stat_row.addWidget(QtWidgets.QLabel("Starbases"), 0, 0)
        stat_row.addWidget(self.stat_adjuster(empire, "starbases"), 0, 1)
        stat_row.addWidget(QtWidgets.QLabel("Weapon Level"), 0, 2)
        stat_row.addWidget(self.stat_adjuster(empire, "weapon_level"), 0, 3)
        stat_row.addWidget(QtWidgets.QLabel("Shield Level"), 1, 0)
        stat_row.addWidget(self.stat_adjuster(empire, "shield_level"), 1, 1)
        layout.addLayout(stat_row)

        return card

    def adjuster(self, empire: Empire, key: str, is_token: bool) -> QtWidgets.QWidget:
        widget = QtWidgets.QWidget()
        layout = QtWidgets.QHBoxLayout(widget)
        layout.setContentsMargins(0, 0, 0, 0)
        minus = QtWidgets.QPushButton("-")
        plus = QtWidgets.QPushButton("+")
        value = QtWidgets.QLabel()
        value.setFixedWidth(40)
        value.setAlignment(QtCore.Qt.AlignCenter)

        if is_token:
            if key == "ascendancy":
                value.setText(str(empire.ascendancy_tokens))
            else:
                value.setText(str(empire.command_tokens))
            minus.clicked.connect(lambda: self.adjust_token(empire.id, key, -1))
            plus.clicked.connect(lambda: self.adjust_token(empire.id, key, 1))
        else:
            value.setText(str(empire.resources.get(key, 0)))
            minus.clicked.connect(lambda: self.adjust_resource(empire.id, key, -1))
            plus.clicked.connect(lambda: self.adjust_resource(empire.id, key, 1))

        layout.addWidget(minus)
        layout.addWidget(value)
        layout.addWidget(plus)
        return widget

    def stat_adjuster(self, empire: Empire, key: str) -> QtWidgets.QWidget:
        widget = QtWidgets.QWidget()
        layout = QtWidgets.QHBoxLayout(widget)
        layout.setContentsMargins(0, 0, 0, 0)
        minus = QtWidgets.QPushButton("-")
        plus = QtWidgets.QPushButton("+")
        value = QtWidgets.QLabel()
        value.setFixedWidth(40)
        value.setAlignment(QtCore.Qt.AlignCenter)
        value.setText(str(getattr(empire, key)))

        minus.clicked.connect(lambda: self.adjust_stat(empire.id, key, -1))
        plus.clicked.connect(lambda: self.adjust_stat(empire.id, key, 1))

        layout.addWidget(minus)
        layout.addWidget(value)
        layout.addWidget(plus)
        return widget

    def update_defense_display(self) -> None:
        empire = self.get_empire(self.defense_empire_combo.currentData())
        if not empire:
            self.defense_value_label.setText("Defense Strength: N/A")
            self.defense_formula_label.setText("")
            return
        totals = self.empire_totals(empire)
        defense = empire.starbases * 10 + empire.weapon_level * 2 + empire.shield_level * 2 + totals["control"]
        self.defense_value_label.setText(f"Defense Strength: {defense}")
        self.defense_formula_label.setText(
            "Formula: "
            f"({empire.starbases} x 10) + ({empire.weapon_level} x 2) + ({empire.shield_level} x 2) + ({totals['control']} CTRL)"
        )


def main() -> None:
    app = QtWidgets.QApplication(sys.argv)
    app.setStyle("Fusion")
    window = CompanionWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
