Ascendancy Companion (Windows 10/11)
===================================

This package contains the full source for a lightweight desktop companion app
built with Python + Qt (PySide6).

RUN (from source)
-----------------
1) Install Python 3.11+ on Windows.
2) Open PowerShell in this folder.
3) Create a virtual environment and install dependencies:

   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt

4) Launch the app:

   python -m ascendancy_companion.main

STATE
-----
The app autosaves to:
  ascendancy_companion/state.json

You can Import/Export JSON from the UI at any time.

BUILD (Windows portable folder)
-------------------------------
This creates a portable folder you can zip and share.

1) Follow the RUN steps above to activate the virtual environment.
2) Build with PyInstaller:

   pyinstaller --noconfirm --clean --windowed \
     --name AscendancyCompanion \
     --collect-all PySide6 \
     ascendancy_companion/main.py

3) The output will be in the dist/AscendancyCompanion folder.
   Zip that folder and distribute it.

TEST CHECKLIST
--------------
[ ] Setup: rename seats, pick civs, start game
[ ] Add 2nd empire to seat 1; edit empire name and civ
[ ] Add system as Unowned; claim it to a different empire; edit it; transfer it; set it back to Unowned
[ ] Add multiple systems to different empires; totals update correctly
[ ] Set initiative order (1/2/3 unique) and verify display
[ ] Click Show Earnings -> verify computed values -> Apply -> resources increment correctly
[ ] Export JSON -> Reset -> Import -> state restored exactly
[ ] Export Log works
