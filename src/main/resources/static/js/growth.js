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

    // 1. Render Volume Trajectory Curve Graph
    if (data.yearlyPoints && data.yearlyPoints.length > 0) {
        renderExecChart(data.yearlyPoints);
    }

    // 2. Render Active Sites Table with CAGR
    renderExecTable(data);
}

function renderExecChart(points) {
    const canvas = document.getElementById("execChartCanvas");
    if (!canvas) return;

    if (execChartInstance) {
        execChartInstance.destroy();
        execChartInstance = null;
    }

    const ctx = canvas.getContext("2d");
    const isDark = !document.body.classList.contains("light");

    const labels = points.map(p => String(p.year));
    const dataVals = points.map(p => p.volume);

    const customLabelsPlugin = {
        id: "customLabelsPlugin",
        afterDatasetsDraw(chart) {
            const chartCtx = chart.ctx;
            const meta = chart.getDatasetMeta(0);

            chartCtx.save();
            chartCtx.font = "bold 11px Inter, sans-serif";
            chartCtx.textAlign = "center";
            chartCtx.textBaseline = "bottom";

            meta.data.forEach((element, index) => {
                const { x, y } = element;
                const pt = points[index];

                chartCtx.fillStyle = isDark ? "#ffffff" : "#0f172a";
                chartCtx.fillText(pt.volume.toLocaleString(), x, y - 10);
            });
            chartCtx.restore();
        }
    };

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
    if (isDark) {
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.40)");
        gradient.addColorStop(1, "rgba(59, 130, 246, 0.02)");
    } else {
        gradient.addColorStop(0, "rgba(37, 99, 235, 0.30)");
        gradient.addColorStop(1, "rgba(37, 99, 235, 0.02)");
    }

    execChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Document Volume",
                data: dataVals,
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
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 25, bottom: 10, left: 10, right: 15 }
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
                    beginAtZero: true,
                    grid: {
                        color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
                    },
                    ticks: {
                        color: isDark ? "#94a3b8" : "#64748b",
                        font: { family: "Inter", size: 10 },
                        callback: val => Number(val).toLocaleString()
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? "#1e293b" : "#ffffff",
                    titleColor: isDark ? "#f8fafc" : "#0f172a",
                    bodyColor: isDark ? "#cbd5e1" : "#334155",
                    borderColor: isDark ? "#334155" : "#e2e8f0",
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: ctx => `Volume: ${ctx.parsed.y.toLocaleString()} documents`
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

    const nYears = years.length > 1 ? (years.length - 1) : 5;

    // Header with 5-Year CAGR
    tableHead.innerHTML = `<tr>
        <th style="padding:12px 18px;text-align:left;font-weight:700;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;">Site</th>
        ${years.map(y => `<th style="padding:12px 10px;text-align:right;font-weight:700;font-size:11px;">${y}</th>`).join("")}
        <th style="padding:12px 18px;text-align:right;font-weight:700;font-size:11px;color:var(--green);">${nYears}-Year CAGR</th>
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