"""Quick retrain with clean data only — 3 verified species."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Override config for clean dataset
import training.train_classifier_v2 as t
t.DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "classifier_dataset_clean"
t.EPOCHS = 20
t.FREEZE_EPOCHS = 3
t.PATIENCE = 8
t.main()
