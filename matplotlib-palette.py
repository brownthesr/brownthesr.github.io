# Site palette for matplotlib restyling
# Copy the parts you need into your existing plot scripts

PALETTE = {
    "bg":           "#0d0d0d",   # fig + ax background
    "primary":      "#d4a024",   # main data: scatter, nodes, primary line
    "highlight":    "#e8b84a",   # secondary data, edges, accents
    "red":          "#c45a3a",   # warm rust
    "blue":         "#5a94c4",   # warm blue
    "teal":         "#3a9e80",   # earthy teal-green
    "rose":         "#c46888",   # dusty rose
    "text":         "#f0ede8",   # titles
    "label":        "#b0a890",   # axis labels, tick labels, legend text
    "muted":        "#7a7060",   # spines, grid, secondary series
    "card":         "#1a1a14",   # legend background
}

# Ordered color cycle for multi-line/multi-series plots
CYCLE = [
    PALETTE["primary"],    # gold
    PALETTE["blue"],       # warm blue
    PALETTE["red"],        # rust
    PALETTE["teal"],       # teal-green
    PALETTE["highlight"],  # light gold
    PALETTE["rose"],       # dusty rose
]

# ── Apply to any figure ──────────────────────────────────────────────

def style_ax(ax):
    ax.set_facecolor(PALETTE["bg"])
    ax.tick_params(colors=PALETTE["label"])
    ax.xaxis.label.set_color(PALETTE["label"])
    ax.yaxis.label.set_color(PALETTE["label"])
    ax.title.set_color(PALETTE["text"])
    for spine in ax.spines.values():
        spine.set_color(PALETTE["muted"])


def make_fig(**kwargs):
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(facecolor=PALETTE["bg"], **kwargs)
    style_ax(ax)
    return fig, ax


# ── Scatter + line plot ──────────────────────────────────────────────

# fig, ax = make_fig()
#
# ax.scatter(x, y,
#     color=PALETTE["primary"], alpha=0.7,
#     edgecolors=PALETTE["highlight"], linewidths=0.5)
#
# ax.plot(x, y,
#     color=PALETTE["highlight"], linewidth=1.5)
#
# # multi-line: colors auto-cycle from CYCLE
# for i, (label, series) in enumerate(data.items()):
#     ax.plot(x, series,
#         color=CYCLE[i % len(CYCLE)], linewidth=1.5, label=label)
#
# ax.legend(
#     facecolor=PALETTE["card"],
#     edgecolor=PALETTE["muted"],
#     labelcolor=PALETTE["label"])


# ── NetworkX graph (two node types) ──────────────────────────────────

# import networkx as nx
#
# fig, ax = make_fig()
#
# nx.draw_networkx_nodes(G, pos, ax=ax,
#     nodelist=type_a_nodes,
#     node_color=PALETTE["primary"],       # gold
#     edgecolors=PALETTE["highlight"],
#     linewidths=0.5, label="Type A")
#
# nx.draw_networkx_nodes(G, pos, ax=ax,
#     nodelist=type_b_nodes,
#     node_color=PALETTE["blue"],          # warm blue
#     edgecolors=PALETTE["teal"],
#     linewidths=0.5, label="Type B")
#
# nx.draw_networkx_edges(G, pos, ax=ax,
#     edge_color=PALETTE["muted"],
#     alpha=0.5, width=0.8)
#
# nx.draw_networkx_labels(G, pos, ax=ax,
#     font_color=PALETTE["text"],
#     font_size=8)
#
# ax.legend(
#     facecolor=PALETTE["card"],
#     edgecolor=PALETTE["muted"],
#     labelcolor=PALETTE["label"])


# ── Saving ───────────────────────────────────────────────────────────

# fig.savefig("plot.png",
#     facecolor=PALETTE["bg"], dpi=150,
#     bbox_inches="tight", transparent=False)
