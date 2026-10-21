/* =====================================================================
 * growth.js — Active Site Growth & CAGR (Compound Annual Growth Rate)
 * Calculates and renders:
 * - Document Volume Trajectory Curve Graph
 * - Active Site Growth Overview Matrix across active manufacturing facilities
 * - 5-Year CAGR (Annual Compound Growth Rate) formula: ((Vn / V0)^(1/n) - 1) * 100
 * ===================================================================== */

var execChartInstance = null;
var currentExecDocType = "BOTH";

function setExecDocType(type) {
    currentExecDocType = type;
    loadExecutiveSummary();
}

function loadExecutiveSummary() {
    const spinner = document.getElementById("spinner");
    if (spinner) spinner.classList.add("on");

    fetch(`/api/growth/summary?docType=${encodeURIComponent(currentExecDocType)}`)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load growth summary");
            return res.json();
        })
        .then(data => {
            renderExecutiveSlide(data);
        })
        .catch(err => {
            console.error("Growth summary error:", err);
            renderExecutiveSlide(null);
        })
        .finally(() => {
            if (spinner) spinner.classList.remove("on");
        });
}

window.loadGrowthAnalytics = loadExecutiveSummary;

function renderExecutiveSlide(data) {
    // 1. Immediately purge any legacy pills or cards if Chrome held stale cached DOM
    document.querySelectorAll(".exec-doc-pill").forEach(p => {
        const wrap = p.closest("div[style*='background']");
        if (wrap && !wrap.contains(document.getElementById("execTableHead"))) {
            wrap.remove();
        } else {
            p.remove();
        }
    });
    ["execKpiBase", "execKpiCurr", "execKpiOverall", "execKpiYoy", "execHeadline", "execBullets"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const card = el.closest(".tab-page > div, div[style*='box-shadow']");
            if (card && !card.contains(document.getElementById("execTableHead")) && !card.contains(document.getElementById("execChartCanvas"))) {
                card.remove();
            } else {
                el.remove();
            }
        }
    });

    const emptyEl = document.getElementById("execEmptyState");
    const contentEl = document.getElementById("execContentContainer");

    if (!data || !data.siteRows || data.siteRows.length === 0) {
        if (emptyEl) emptyEl.style.display = "block";
        if (contentEl) contentEl.style.display = "none";
        return;
    }

    if (emptyEl) emptyEl.style.display = "none";
    if (contentEl) contentEl.style.display = "flex";

    // Update dynamic subtitle
    const subtitleEl = document.getElementById("execChartSubtitle");
    if (subtitleEl && data.baselineYear && data.currentYear) {
        subtitleEl.textContent = `Active Manufacturing Facilities Aggregated Volume Trajectory & Yearly CAGR (${data.baselineYear} – ${data.currentYear})`;
    }

    // 1. Render Volume Trajectory Curve Graph with Yearly CAGR
    if (data.yearlyPoints && data.yearlyPoints.length > 0) {
        renderExecChart(data.yearlyPoints, data.baselineYear);
    }

    // 2. Render Active Sites Table with dynamic CAGR (e.g. 5-Year CAGR, 10-Year CAGR)
    renderExecTable(data);
}

function renderExecChart(points, baselineYear) {
    const canvas = document.getElementById("execChartCanvas");
    if (!canvas) return;

    if (execChartInstance) {
        execChartInstance.destroy();
        execChartInstance = null;
    }

    const ctx = canvas.getContext("2d");
    const isDark = !document.body.classList.contains("light");

    const labels = points.map(p => String(p.year));
    const volumeVals = points.map(p => p.volume);
    const cagrVals = points.map(p => (p.cagrPct !== null && p.cagrPct !== undefined) ? p.cagrPct : 0.0);

    const customLabelsPlugin = {
        id: "customLabelsPlugin",
        afterDatasetsDraw(chart) {
            const chartCtx = chart.ctx;
            const meta0 = chart.getDatasetMeta(0);

            chartCtx.save();
            chartCtx.textAlign = "center";

            meta0.data.forEach((element, index) => {
                if (element.skip) return;
                const { x, y } = element;
                const pt = points[index];

                // 1. Draw Document Volume
                chartCtx.font = "bold 11px Inter, sans-serif";
                chartCtx.fillStyle = isDark ? "#ffffff" : "#0f172a";
                chartCtx.fillText(pt.volume.toLocaleString(), x, y - 20);

                // 2. Draw Yearly CAGR Label directly above/below node
                if (index === 0) {
                    chartCtx.font = "600 10px Inter, sans-serif";
                    chartCtx.fillStyle = isDark ? "#94a3b8" : "#64748b";
                    chartCtx.fillText("Baseline", x, y - 8);
                } else if (pt.cagrPct !== null && pt.cagrPct !== undefined) {
                    const cagrSign = pt.cagrPct >= 0 ? "+" : "";
                    const cagrText = `${cagrSign}${pt.cagrPct.toFixed(1)}% CAGR`;
                    chartCtx.font = "bold 10px Inter, sans-serif";
                    chartCtx.fillStyle = pt.cagrPct >= 0 ? "#10b981" : "#f43f5e";
                    chartCtx.fillText(cagrText, x, y - 8);
                }
            });
            chartCtx.restore();
        }
    };

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
    if (isDark) {
        gradient.addColorStop(0, "rgba(2, 132, 199, 0.40)");
        gradient.addColorStop(1, "rgba(2, 132, 199, 0.02)");
    } else {
        gradient.addColorStop(0, "rgba(2, 132, 199, 0.25)");
        gradient.addColorStop(1, "rgba(2, 132, 199, 0.02)");
    }

    execChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Document Volume",
                    data: volumeVals,
                    yAxisID: "y",
                    borderColor: "#0284c7",
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.28,
                    pointBackgroundColor: "#0284c7",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: "Yearly CAGR (%)",
                    data: cagrVals,
                    yAxisID: "y1",
                    borderColor: "#10b981",
                    borderWidth: 2.2,
                    borderDash: [5, 4],
                    backgroundColor: "transparent",
                    fill: false,
                    tension: 0.28,
                    pointBackgroundColor: "#10b981",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 32, bottom: 10, left: 10, right: 15 }
            },
            interaction: {
                mode: "index",
                intersect: false
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: isDark ? "#94a3b8" : "#64748b",
                        font: { family: "Inter", size: 11, weight: "bold" }
                    }
                },
                y: {
                    type: "linear",
                    position: "left",
                    beginAtZero: true,
                    grid: {
                        color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
                    },
                    ticks: {
                        color: isDark ? "#94a3b8" : "#64748b",
                        font: { family: "Inter", size: 10 },
                        callback: val => Number(val).toLocaleString()
                    },
                    title: {
                        display: true,
                        text: "Volume (Docs)",
                        color: isDark ? "#94a3b8" : "#64748b",
                        font: { family: "Inter", size: 10, weight: "600" }
                    }
                },
                y1: {
                    type: "linear",
                    position: "right",
                    grid: { display: false },
                    ticks: {
                        color: "#10b981",
                        font: { family: "Inter", size: 10, weight: "bold" },
                        callback: val => (val >= 0 ? "+" : "") + val + "%"
                    },
                    title: {
                        display: true,
                        text: "Yearly CAGR (%)",
                        color: "#10b981",
                        font: { family: "Inter", size: 10, weight: "600" }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    align: "end",
                    labels: {
                        boxWidth: 14,
                        boxHeight: 3,
                        color: isDark ? "#cbd5e1" : "#475569",
                        font: { family: "Inter", size: 11, weight: "600" },
                        padding: 12
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? "#0f172a" : "#ffffff",
                    titleColor: isDark ? "#f8fafc" : "#0f172a",
                    bodyColor: isDark ? "#cbd5e1" : "#334155",
                    borderColor: isDark ? "#334155" : "#e2e8f0",
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 4,
                    cornerRadius: 8,
                    callbacks: {
                        title: items => `Year: ${items[0].label}`,
                        label: ctx => {
                            if (ctx.datasetIndex === 0) {
                                return `📦 Document Volume: ${ctx.parsed.y.toLocaleString()} documents`;
                            } else {
                                const val = ctx.parsed.y;
                                if (ctx.dataIndex === 0) {
                                    return `🌱 Baseline Portfolio Year`;
                                }
                                const sign = val >= 0 ? "+" : "";
                                return `📈 Yearly CAGR: ${sign}${val.toFixed(1)}%`;
                            }
                        },
                        afterBody: items => {
                            const idx = items[0].dataIndex;
                            const pt = points[idx];
                            const lines = [];
                            if (pt.yoyGrowthPct !== null && pt.yoyGrowthPct !== undefined) {
                                const sign = pt.yoyGrowthPct >= 0 ? "+" : "";
                                lines.push(`⚡ YoY Annual Growth: ${sign}${pt.yoyGrowthPct.toFixed(1)}%`);
                            }
                            return lines;
                        }
                    }
                }
            }
        },
        plugins: [customLabelsPlugin]
    });
}

function renderExecTable(data) {
    const tableHead = document.getElementById("execTableHead");
    const tableBody = document.getElementById("execTableBody");
    if (!tableHead || !tableBody) return;

    const years = (data.yearlyPoints && data.yearlyPoints.length > 0)
        ? data.yearlyPoints.map(p => p.year)
        : (data.siteRows[0] ? data.siteRows[0].yearlyVolumes.map((_, idx) => (2021 + idx)) : []);

    const spanYears = (data.spanYears && data.spanYears > 0)
        ? data.spanYears
        : (years.length > 1 ? (years[years.length - 1] - years[0]) : 5);

    const cagrColumnHeader = `${spanYears}-Year CAGR`;

    // Dynamic header with N-Year CAGR
    tableHead.innerHTML = `<tr>
        <th style="padding:12px 18px;text-align:left;font-weight:700;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;">Site</th>
        ${years.map(y => `<th style="padding:12px 10px;text-align:right;font-weight:700;font-size:11px;">${y}</th>`).join("")}
        <th style="padding:12px 18px;text-align:right;font-weight:700;font-size:11px;color:var(--green);">${cagrColumnHeader}</th>
    </tr>`;

    let html = "";

    // Site rows
    data.siteRows.forEach((row, i) => {
        const cagr = row.cagrPct !== undefined ? row.cagrPct : 0.0;
        const cagrSign = cagr >= 0 ? "+" : "";
        const cagrColor = cagr >= 0 ? "#10b981" : "#f43f5e";

        const bgStyle = i % 2 === 0 ? "background:var(--hover);" : "";

        html += `<tr style="${bgStyle};transition:background .15s;">
            <td style="padding:11px 18px;font-weight:600;font-size:12px;color:var(--text);">${row.siteName}</td>
            ${row.yearlyVolumes.map(v => `<td style="padding:11px 10px;text-align:right;font-size:12px;color:var(--text);">${v.toLocaleString()}</td>`).join("")}
            <td style="padding:11px 18px;text-align:right;font-weight:700;font-size:12px;color:${cagrColor};">${cagrSign}${cagr.toFixed(1)}%</td>
        </tr>`;
    });

    // Total row
    if (data.totalRow) {
        const tr = data.totalRow;
        const cagr = tr.cagrPct !== undefined ? tr.cagrPct : 0.0;
        const cagrSign = cagr >= 0 ? "+" : "";
        const cagrColor = cagr >= 0 ? "#10b981" : "#f43f5e";

        html += `<tr style="border-top:2px solid var(--border);background:var(--card);font-weight:700;">
            <td style="padding:13px 18px;font-size:12px;color:var(--text);font-weight:700;">${tr.siteName}</td>
            ${tr.yearlyVolumes.map(v => `<td style="padding:13px 10px;text-align:right;font-size:12px;color:var(--text);font-weight:700;">${v.toLocaleString()}</td>`).join("")}
            <td style="padding:13px 18px;text-align:right;font-weight:800;font-size:13px;color:${cagrColor};">${cagrSign}${cagr.toFixed(1)}%</td>
        </tr>`;
    }

    tableBody.innerHTML = html;
}