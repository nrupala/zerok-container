## Import Rules

GUI and CLI layers may only import:
- zerok.core

They must never import:
- zerok.crypto
- zerok.keys
- zerok.blob

Violations are considered security defects.