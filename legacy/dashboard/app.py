"""
📊 Bible Analytics Dashboard
Interactive Streamlit dashboard for exploring Biblical text analytics.

Run with: streamlit run dashboard/app.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import duckdb

# ─── Page config ──────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Bible Analytics Dashboard",
    page_icon="🕊️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Database connection ──────────────────────────────────────────────────────

DB_PATH = Path(__file__).parent.parent / "data" / "analytics" / "bible.duckdb"


@st.cache_resource
def get_connection():
    """Get a DuckDB connection (cached)."""
    if not DB_PATH.exists():
        st.error(
            "❌ Database not found. Run the pipeline first:\n\n"
            "```bash\npython -m src.cli run\n```"
        )
        st.stop()
    return duckdb.connect(str(DB_PATH), read_only=True)


def query(sql: str) -> pd.DataFrame:
    """Execute a query and return a DataFrame."""
    conn = get_connection()
    return conn.execute(sql).fetchdf()


# ─── Sidebar ──────────────────────────────────────────────────────────────────

st.sidebar.title("🕊️ Bible Analytics")
st.sidebar.markdown("---")

page = st.sidebar.radio(
    "Navigate",
    ["📊 Overview", "📖 Book Explorer", "💭 Sentiment Analysis", "🔍 Verse Search", "📈 Comparisons"],
)

# ─── Overview page ────────────────────────────────────────────────────────────

if page == "📊 Overview":
    st.title("📊 Bible Data Pipeline — Overview")
    st.markdown("A comprehensive analytical view of the Bible's 66 books.")

    # KPIs
    col1, col2, col3, col4 = st.columns(4)
    stats = query("""
        SELECT
            COUNT(*) AS verses,
            COUNT(DISTINCT book_id) AS books,
            SUM(word_count) AS words,
            COUNT(DISTINCT book_id || ':' || chapter::VARCHAR) AS chapters
        FROM verses
    """)

    col1.metric("📖 Books", f"{stats['books'].iloc[0]}")
    col2.metric("📄 Chapters", f"{stats['chapters'].iloc[0]:,}")
    col3.metric("✏️ Verses", f"{stats['verses'].iloc[0]:,}")
    col4.metric("📝 Words", f"{stats['words'].iloc[0]:,}")

    st.markdown("---")

    # Testament comparison
    col_left, col_right = st.columns(2)

    with col_left:
        st.subheader("Testament Distribution")
        testament_data = query("SELECT * FROM v_testament_summary")
        fig = px.pie(
            testament_data,
            values="verses",
            names="testament",
            color="testament",
            color_discrete_map={"Old Testament": "#4A90D9", "New Testament": "#D94A4A"},
            hole=0.4,
        )
        fig.update_layout(margin=dict(t=20, b=20, l=20, r=20))
        st.plotly_chart(fig, use_container_width=True)

    with col_right:
        st.subheader("Verses by Category")
        cat_data = query("SELECT * FROM v_category_summary ORDER BY verses DESC")
        fig = px.bar(
            cat_data,
            x="category",
            y="verses",
            color="testament",
            color_discrete_map={"Old Testament": "#4A90D9", "New Testament": "#D94A4A"},
            barmode="group",
        )
        fig.update_layout(margin=dict(t=20, b=20), xaxis_tickangle=-45)
        st.plotly_chart(fig, use_container_width=True)

    # Word count heatmap by book
    st.subheader("📊 Words per Book (Canonical Order)")
    book_data = query("""
        SELECT book_name, book_position, total_words, total_verses, avg_words_per_verse
        FROM book_stats ORDER BY book_position
    """)

    fig = px.bar(
        book_data,
        x="book_name",
        y="total_words",
        color="avg_words_per_verse",
        color_continuous_scale="Viridis",
        labels={"total_words": "Total Words", "avg_words_per_verse": "Avg Words/Verse"},
    )
    fig.update_layout(xaxis_tickangle=-90, height=500, margin=dict(b=120))
    st.plotly_chart(fig, use_container_width=True)

# ─── Book Explorer ────────────────────────────────────────────────────────────

elif page == "📖 Book Explorer":
    st.title("📖 Book Explorer")

    books = query("SELECT DISTINCT book_name, book_id, book_position FROM verses ORDER BY book_position")
    selected_book = st.selectbox("Select a book", books["book_name"].tolist())
    book_id = books[books["book_name"] == selected_book]["book_id"].iloc[0]

    # Book stats
    book_stats = query(f"SELECT * FROM book_stats WHERE book_id = '{book_id}'")
    if not book_stats.empty:
        row = book_stats.iloc[0]
        c1, c2, c3, c4, c5 = st.columns(5)
        c1.metric("Chapters", row["total_chapters"])
        c2.metric("Verses", row["total_verses"])
        c3.metric("Words", f"{row['total_words']:,}")
        c4.metric("Avg Words/Verse", f"{row['avg_words_per_verse']:.1f}")
        c5.metric("Avg Sentiment", f"{row['avg_sentiment']:.3f}")

    st.markdown("---")

    # Chapter sentiment heatmap
    st.subheader(f"Sentiment Across {selected_book}")
    ch_data = query(f"""
        SELECT chapter, avg_sentiment, avg_subjectivity, total_verses, total_words
        FROM chapter_stats WHERE book_id = '{book_id}' ORDER BY chapter
    """)

    if not ch_data.empty:
        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=ch_data["chapter"], y=ch_data["avg_sentiment"],
            name="Sentiment",
            marker_color=ch_data["avg_sentiment"].apply(
                lambda x: "#2ecc71" if x > 0.05 else "#e74c3c" if x < -0.05 else "#95a5a6"
            ),
        ))
        fig.update_layout(
            xaxis_title="Chapter",
            yaxis_title="Average Sentiment",
            height=400,
        )
        st.plotly_chart(fig, use_container_width=True)

    # Sample verses
    st.subheader("Sample Verses")
    ch_num = st.slider("Chapter", 1, int(ch_data["chapter"].max()) if not ch_data.empty else 1, 1)
    verses = query(f"""
        SELECT verse, text, word_count, sentiment_label, ROUND(sentiment_polarity, 3) AS polarity
        FROM verses WHERE book_id = '{book_id}' AND chapter = {ch_num}
        ORDER BY verse
    """)
    st.dataframe(verses, use_container_width=True, hide_index=True)

# ─── Sentiment Analysis ──────────────────────────────────────────────────────

elif page == "💭 Sentiment Analysis":
    st.title("💭 Sentiment Analysis")

    # Sentiment journey across the Bible
    st.subheader("Sentiment Journey Through the Bible")
    journey = query("""
        SELECT book_position, book_name, chapter,
               avg_sentiment, verses
        FROM v_sentiment_journey
        ORDER BY book_position, chapter
    """)

    if not journey.empty:
        journey["sequence"] = range(len(journey))
        fig = px.scatter(
            journey,
            x="sequence",
            y="avg_sentiment",
            color="avg_sentiment",
            color_continuous_scale="RdYlGn",
            hover_data=["book_name", "chapter", "verses"],
            labels={"sequence": "Bible Progression →", "avg_sentiment": "Sentiment"},
        )
        fig.add_hline(y=0, line_dash="dash", line_color="gray", opacity=0.5)
        fig.update_layout(height=500, showlegend=False)
        st.plotly_chart(fig, use_container_width=True)

    st.markdown("---")

    # Sentiment distribution
    col_l, col_r = st.columns(2)

    with col_l:
        st.subheader("Sentiment Distribution")
        dist = query("""
            SELECT sentiment_label, COUNT(*) AS count
            FROM verses GROUP BY sentiment_label
        """)
        fig = px.pie(
            dist, values="count", names="sentiment_label",
            color="sentiment_label",
            color_discrete_map={"positive": "#2ecc71", "negative": "#e74c3c", "neutral": "#95a5a6"},
        )
        st.plotly_chart(fig, use_container_width=True)

    with col_r:
        st.subheader("Most Positive Chapters")
        positive = query("SELECT * FROM v_most_positive_chapters LIMIT 10")
        st.dataframe(positive, use_container_width=True, hide_index=True)

    # Most extreme verses
    st.subheader("Most Positive vs Most Negative Verses")
    col_pos, col_neg = st.columns(2)

    with col_pos:
        st.markdown("**🟢 Most Positive**")
        pos_verses = query("""
            SELECT reference, text, ROUND(sentiment_polarity, 3) AS polarity
            FROM verses ORDER BY sentiment_polarity DESC LIMIT 10
        """)
        for _, r in pos_verses.iterrows():
            st.markdown(f"**{r['reference']}** ({r['polarity']})")
            st.caption(r["text"])

    with col_neg:
        st.markdown("**🔴 Most Negative**")
        neg_verses = query("""
            SELECT reference, text, ROUND(sentiment_polarity, 3) AS polarity
            FROM verses ORDER BY sentiment_polarity ASC LIMIT 10
        """)
        for _, r in neg_verses.iterrows():
            st.markdown(f"**{r['reference']}** ({r['polarity']})")
            st.caption(r["text"])

# ─── Verse Search ─────────────────────────────────────────────────────────────

elif page == "🔍 Verse Search":
    st.title("🔍 Verse Search")

    search_term = st.text_input("Search verses by keyword", placeholder="love, faith, hope...")

    if search_term:
        results = query(f"""
            SELECT reference, text, book_name, chapter, verse,
                   word_count, sentiment_label,
                   ROUND(sentiment_polarity, 3) AS polarity
            FROM verses
            WHERE LOWER(text) LIKE '%{search_term.lower()}%'
            ORDER BY book_position, chapter, verse
            LIMIT 100
        """)

        st.info(f"Found **{len(results)}** verses containing '{search_term}'")

        if not results.empty:
            # Stats about search results
            c1, c2, c3 = st.columns(3)
            c1.metric("Matching Verses", len(results))
            c2.metric("Avg Sentiment", f"{results['polarity'].mean():.3f}")
            c3.metric("Books Represented", results["book_name"].nunique())

            st.dataframe(results, use_container_width=True, hide_index=True)

# ─── Comparisons ──────────────────────────────────────────────────────────────

elif page == "📈 Comparisons":
    st.title("📈 Book Comparisons")

    books = query("SELECT DISTINCT book_name, book_id FROM book_stats ORDER BY book_name")
    selected = st.multiselect(
        "Select books to compare",
        books["book_name"].tolist(),
        default=["Genesis", "Psalms", "Matthew", "Revelation"],
    )

    if selected:
        placeholders = ", ".join(f"'{b}'" for b in selected)
        data = query(f"""
            SELECT * FROM book_stats
            WHERE book_name IN ({placeholders})
            ORDER BY book_position
        """)

        if not data.empty:
            st.subheader("Comparative Metrics")

            fig = px.bar(
                data, x="book_name",
                y=["total_verses", "total_words"],
                barmode="group",
                labels={"value": "Count", "book_name": "Book"},
            )
            st.plotly_chart(fig, use_container_width=True)

            fig2 = px.bar(
                data, x="book_name", y="avg_sentiment",
                color="avg_sentiment", color_continuous_scale="RdYlGn",
                labels={"avg_sentiment": "Avg Sentiment"},
            )
            fig2.add_hline(y=0, line_dash="dash", line_color="gray")
            st.plotly_chart(fig2, use_container_width=True)

            st.subheader("Sentiment Spectrum")
            fig3 = px.bar(
                data, x="book_name",
                y=["positive_verses", "neutral_verses", "negative_verses"],
                barmode="stack",
                color_discrete_map={
                    "positive_verses": "#2ecc71",
                    "neutral_verses": "#95a5a6",
                    "negative_verses": "#e74c3c",
                },
            )
            st.plotly_chart(fig3, use_container_width=True)

            st.subheader("Raw Data")
            st.dataframe(data, use_container_width=True, hide_index=True)


# ─── Footer ───────────────────────────────────────────────────────────────────

st.sidebar.markdown("---")
st.sidebar.markdown(
    "Built with **Bible Data Pipeline** 🕊️\n\n"
    "Data: KJV Bible via bible-api.com\n\n"
    "Stack: Python · DuckDB · Streamlit · Plotly"
)
