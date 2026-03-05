# =============================================================================
# Student Performance Grade Prediction - Logistic Regression
# =============================================================================


import pandas as pd
import numpy as np
import os
import joblib
import warnings

from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    classification_report,
    precision_score,
    recall_score,
    f1_score,
    r2_score,
)

warnings.filterwarnings("ignore")

# =============================================================================
# Step 1: Data Collection
# =============================================================================
print("=" * 65)
print("  STEP 1: DATA COLLECTION")
print("=" * 65)

dataset_path = os.path.join(os.path.dirname(__file__), "..", "dataset", "student_performance.csv")
df = pd.read_csv(dataset_path, low_memory=False)

print(f"  Dataset loaded from: {dataset_path}")
print(f"  Shape: {df.shape[0]:,} rows x {df.shape[1]} columns")
print(f"  Columns: {list(df.columns)}")
print(f"\n  First 5 rows:")
print(df.head().to_string(index=False))

# =============================================================================
# Step 2: Data Preprocessing
# =============================================================================
print("\n" + "=" * 65)
print("  STEP 2: DATA PREPROCESSING")
print("=" * 65)

# --- 2a. Drop unnecessary columns ---
cols_to_drop = [col for col in df.columns if col.startswith("Unnamed")]
if cols_to_drop:
    df.drop(columns=cols_to_drop, inplace=True)
    print(f"\n  [DROP] Removed extra columns: {cols_to_drop}")

if "student_id" in df.columns:
    df.drop(columns=["student_id"], inplace=True)
    print("  [DROP] Removed 'student_id' (not a feature)")

print(f"\n  Remaining columns: {list(df.columns)}")

# --- 2b. Handle missing values ---
print("\n  --- Handling Missing Values ---")
numeric_cols = ["weekly_self_study_hours", "attendance_percentage", "class_participation", "total_score"]
for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")

missing_before = df.isnull().sum()
print(f"  Missing values BEFORE:\n{missing_before.to_string()}")

total_missing = missing_before.sum()
if total_missing > 0:
    for col in numeric_cols:
        if df[col].isnull().sum() > 0:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)
            print(f"  -> Filled '{col}' with median: {median_val}")

    rows_before = len(df)
    df.dropna(subset=["grade"], inplace=True)
    rows_after = len(df)
    if rows_before != rows_after:
        print(f"  -> Dropped {rows_before - rows_after} rows with missing 'grade'")

missing_after = df.isnull().sum()
print(f"\n  Missing values AFTER:\n{missing_after.to_string()}")

# --- 2c. Encode grades (A=0, B=1, C=2, D=3, F=4) ---
print("\n  --- Encoding Grade Labels ---")
grade_mapping = {"A": 0, "B": 1, "C": 2, "D": 3, "F": 4}
df["grade"] = df["grade"].str.strip().map(grade_mapping)

unmapped = df["grade"].isnull().sum()
if unmapped > 0:
    print(f"  -> Dropping {unmapped} rows with unknown grade values")
    df.dropna(subset=["grade"], inplace=True)

df["grade"] = df["grade"].astype(int)

print(f"  Encoding: {grade_mapping}")
print(f"\n  Grade distribution:")
for grade_num, count in df["grade"].value_counts().sort_index().items():
    grade_letter = [k for k, v in grade_mapping.items() if v == grade_num][0]
    print(f"    Grade {grade_letter} (={grade_num}): {count:>10,} samples ({count/len(df)*100:.1f}%)")

# --- 2d. Normalize features (Min-Max Scaling) ---
print("\n  --- Normalizing Features (Min-Max) ---")
feature_cols = ["weekly_self_study_hours", "attendance_percentage", "class_participation", "total_score"]

scaler = MinMaxScaler()
df[feature_cols] = scaler.fit_transform(df[feature_cols])

print(f"  Features normalized: {feature_cols}")
print(f"\n  Normalized sample:")
print(df.head().to_string(index=False))

# =============================================================================
# Step 3: Feature Engineering & Split Data
# =============================================================================
print("\n" + "=" * 65)
print("  STEP 3: FEATURE ENGINEERING & SPLIT DATA")
print("=" * 65)

# --- 3a. Create interaction features ---
print("\n  --- Feature Engineering (Interaction Features) ---")
df["study_x_attendance"] = df["weekly_self_study_hours"] * df["attendance_percentage"]
df["study_x_participation"] = df["weekly_self_study_hours"] * df["class_participation"]
df["attendance_x_participation"] = df["attendance_percentage"] * df["class_participation"]

all_feature_cols = feature_cols + ["study_x_attendance", "study_x_participation", "attendance_x_participation"]

print(f"  Original features:    {len(feature_cols)}")
print(f"  + Interaction features: 3")
print(f"  Total features:       {len(all_feature_cols)}")
print(f"  Feature names: {all_feature_cols}")

X = df[all_feature_cols]
y = df["grade"]

# --- 3b. Split Data (80/20) ---
print(f"\n  --- Splitting Data (80% Train / 20% Test) ---")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"  Total samples:    {len(X):>10,}")
print(f"  Training samples: {len(X_train):>10,} ({len(X_train)/len(X)*100:.1f}%)")
print(f"  Testing samples:  {len(X_test):>10,} ({len(X_test)/len(X)*100:.1f}%)")

print(f"\n  Training grade distribution:")
for grade_num, count in y_train.value_counts().sort_index().items():
    grade_letter = [k for k, v in grade_mapping.items() if v == grade_num][0]
    print(f"    Grade {grade_letter}: {count:>10,}")

print(f"\n  Testing grade distribution:")
for grade_num, count in y_test.value_counts().sort_index().items():
    grade_letter = [k for k, v in grade_mapping.items() if v == grade_num][0]
    print(f"    Grade {grade_letter}: {count:>10,}")

# =============================================================================
# Step 4: Train Logistic Regression Model
# =============================================================================
print("\n" + "=" * 65)
print("  STEP 4: TRAIN LOGISTIC REGRESSION MODEL")
print("=" * 65)

model = LogisticRegression(
    max_iter=1000,
    solver="lbfgs",
    C=0.1,
    random_state=42,
    n_jobs=-1,
)

# --- Cross-Validation (5-Fold) ---
print("\n  --- 5-Fold Stratified Cross-Validation ---")
print("  (Using a stratified sample of 50,000 for CV speed)\n")

cv_sample_size = 50000
X_cv, _, y_cv, _ = train_test_split(
    X_train, y_train, train_size=cv_sample_size, random_state=42, stratify=y_train
)

cv_strategy = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

print("  Cross-validating: Logistic Regression...", end=" ", flush=True)
cv_scores = cross_val_score(model, X_cv, y_cv, cv=cv_strategy, scoring="accuracy", n_jobs=-1)
print(f"Done!")
print(f"  Mean CV Accuracy = {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
print(f"  Fold scores: {[f'{s:.4f}' for s in cv_scores]}")

# --- Train on full training set ---
print("\n  --- Training on Full Training Set ---\n")
print("  Training: Logistic Regression...", end=" ", flush=True)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)
print("Done!")

# =============================================================================
# Step 5: Evaluate Logistic Regression Model
# =============================================================================
print("\n" + "=" * 65)
print("  STEP 5: EVALUATE LOGISTIC REGRESSION MODEL")
print("=" * 65)

grade_labels = ["A", "B", "C", "D", "F"]

acc = accuracy_score(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
prec_w = precision_score(y_test, y_pred, average="weighted", zero_division=0)
rec_w = recall_score(y_test, y_pred, average="weighted", zero_division=0)
f1_w = f1_score(y_test, y_pred, average="weighted", zero_division=0)
cm = confusion_matrix(y_test, y_pred)

print(f"\n  METRICS:")
print(f"    Accuracy:           {acc:.4f} ({acc*100:.2f}%)")
print(f"    R2 Score:           {r2:.4f}")
print(f"    Precision (Wtd):    {prec_w:.4f}")
print(f"    Recall (Wtd):       {rec_w:.4f}")
print(f"    F1 Score (Wtd):     {f1_w:.4f}")
print(f"    CV Accuracy (5F):   {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

# Confusion Matrix
print(f"\n  CONFUSION MATRIX:")
print(f"  {'':>8}", end="")
for label in grade_labels:
    print(f"{'Pred '+label:>9}", end="")
print()
for i, label in enumerate(grade_labels):
    print(f"  {'Act '+label:>8}", end="")
    for j in range(len(grade_labels)):
        print(f"{cm[i][j]:>9}", end="")
    print()

# Per-class metrics
prec_per = precision_score(y_test, y_pred, average=None, labels=list(range(5)), zero_division=0)
rec_per = recall_score(y_test, y_pred, average=None, labels=list(range(5)), zero_division=0)
f1_per = f1_score(y_test, y_pred, average=None, labels=list(range(5)), zero_division=0)

print(f"\n  PER-CLASS BREAKDOWN:")
print(f"  {'Grade':>8}{'Precision':>12}{'Recall':>12}{'F1 Score':>12}")
print(f"  {'-'*44}")
for i, label in enumerate(grade_labels):
    print(f"  {label:>8}{prec_per[i]:>12.4f}{rec_per[i]:>12.4f}{f1_per[i]:>12.4f}")
print(f"  {'-'*44}")
print(f"  {'Weighted':>8}{prec_w:>12.4f}{rec_w:>12.4f}{f1_w:>12.4f}")

# =============================================================================
# Save Model
# =============================================================================
print(f"\n  MODEL: Logistic Regression (Accuracy: {acc:.4f})")

model_dir = os.path.dirname(__file__)
os.makedirs(model_dir, exist_ok=True)

model_path = os.path.join(model_dir, "best_model.pkl")
joblib.dump(model, model_path)
print(f"  Model saved to: {model_path}")

scaler_path = os.path.join(model_dir, "scaler.pkl")
joblib.dump(scaler, scaler_path)
print(f"  Scaler saved to: {scaler_path}")

# Full classification report
print(f"\n  {'='*60}")
print(f"  FULL CLASSIFICATION REPORT (Logistic Regression)")
print(f"  {'='*60}")
target_names = [f"Grade {g}" for g in grade_labels]
print(classification_report(
    y_test, y_pred,
    target_names=target_names, zero_division=0
))

print("=" * 65)
print("  PIPELINE COMPLETE!")
print("=" * 65)
