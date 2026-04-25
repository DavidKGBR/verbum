# Streamlit dashboard (v1 legacy)

The original Verbum proof-of-concept was a Streamlit notebook-style
dashboard. It still loads against `data/analytics/bible.duckdb` and
can be run with `streamlit run legacy/dashboard/app.py`, but it is no
longer the primary surface — the React + FastAPI app at
[verbum-app-bible.web.app](https://verbum-app-bible.web.app) is.

Kept here for historical context. The Streamlit app is not part of the
production deployment and is excluded from the Cloud Run image.
