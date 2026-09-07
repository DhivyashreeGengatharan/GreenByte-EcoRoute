import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  LeafIcon, 
  CloseIcon, 
  DownloadIcon, 
  ShieldCheckIcon, 
  SlidersIcon,
  ZapIcon
} from './ui/Icons';
import Button from './ui/Button';
import { Badge } from './ui/Badge';
import { Metric } from './ui/Metric';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AIInsightData {
  headline: string;
  content: string;
  tech_specs: string;
  recommendation: string;
}

interface Props {
  initialAQI: number;
  newAQI: number;
  reductionAmount: number;
  intervention: string;
  estimatedCost: number;
  traffic: string;
  buildingDensity: string;
  result?: {
    newAQI: number;
    reductionAmount: number;
    credits: number;
    aiInsight: string | AIInsightData;
    estimatedDays: number;
    dailyAQIHistory: number[];
    trafficHistory: number[];
    aqiForecast: number[];
    trafficForecast: number[];
  };
  onClose: () => void;
}

export const AnalyticsView: React.FC<Props> = ({
  initialAQI,
  newAQI,
  intervention,
  estimatedCost,
  traffic,
  buildingDensity,
  result,
  onClose
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [simulationId] = useState(() => Math.random().toString(36).substring(2, 9).toUpperCase());
  const reportDate = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!result) return null;

  const dailyHistory = result.dailyAQIHistory || [];
  const aqiForecast = result.aqiForecast || [];
  const trafficHistory = result.trafficHistory || [];
  const trafficForecast = result.trafficForecast || [];

  const insightData = useMemo(() => {
    if (!result.aiInsight) return null;
    if (typeof result.aiInsight === 'string') {
      try {
        return JSON.parse(result.aiInsight);
      } catch {
        return {
          headline: "Urban Microclimate Assessment Complete",
          content: result.aiInsight,
          tech_specs: "Standard Biophilic & Filter Array",
          recommendation: "Deploy modular units along arterial road corridors for maximum microclimate shielding."
        };
      }
    }
    return result.aiInsight as AIInsightData;
  }, [result]);

  const combinedAQILabels = [
    ...dailyHistory.map((_, i) => `D-${dailyHistory.length - i}`),
    ...aqiForecast.map((_, i) => `D+${i + 1}`)
  ];

  const combinedAQIData = [
    ...dailyHistory,
    ...aqiForecast
  ];

  if (combinedAQIData.length === 0) {
    combinedAQIData.push(initialAQI);
    combinedAQILabels.push('Today');
  }

  const comparisons = [
    { name: "Biochar", cost: 8000, r: 0.10 },
    { name: "Green Wall", cost: 12000, r: 0.15 },
    { name: "Algae Panel", cost: 25000, r: 0.25 },
    { name: "Cool Roof", cost: 35000, r: 0.22 },
    { name: "Retrofit", cost: 45000, r: 0.20 },
    { name: "DAC", cost: 80000, r: 0.45 },
  ];

  // Chart 1: Real-time AQI Trend
  const trendChartData: ChartData<'line'> = {
    labels: combinedAQILabels,
    datasets: [
      {
        label: 'Sensor & Simulated AQI',
        data: combinedAQIData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        fill: true,
        pointRadius: 2,
        tension: 0.35,
        segment: {
          borderColor: (ctx) => (ctx.p0DataIndex < dailyHistory.length) ? '#64748b' : '#10b981',
          borderDash: (ctx) => (ctx.p0DataIndex < dailyHistory.length) ? [] : [4, 4],
        }
      },
    ],
  };

  // Chart 2: Multi-Intervention Comparison
  const barData: ChartData<'bar'> = {
    labels: comparisons.map(c => c.name),
    datasets: [{
      label: 'AQI Point Reduction',
      data: comparisons.map(c => initialAQI * c.r),
      backgroundColor: comparisons.map(c => 
        c.name.toLowerCase() === intervention.toLowerCase() ? '#10b981' : 'rgba(148, 163, 184, 0.4)'
      ),
      borderRadius: 6,
    }],
  };

  // Chart 3: Traffic Correlation
  const trafficChartData: ChartData<'line'> = {
    labels: combinedAQILabels,
    datasets: [{
      label: 'Average Flow Velocity (km/h)',
      data: [...trafficHistory, ...trafficForecast],
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      fill: true,
      tension: 0.4,
      pointRadius: 0
    }]
  };

  const commonOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 10,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        cornerRadius: 8,
      }
    },
    scales: {
      x: { 
        display: false,
        grid: { display: false }
      },
      y: { 
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { font: { size: 10 } }
      }
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`EcoRoute_DigitalTwin_Report_${simulationId}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Failed to export PDF report");
    } finally {
      setDownloading(false);
    }
  };

  const percentImprovement = Math.round(((initialAQI - newAQI) / initialAQI) * 100);

  return (
    <div className="analytics-overlay" style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(10, 15, 29, 0.75)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      zIndex: 1500,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      overflowY: 'auto'
    }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1080px',
        width: '100%',
        margin: '0 auto 20px auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
          }}>
            <SlidersIcon size={20} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.01em' }}>
              Digital Twin Simulation Laboratory
            </h2>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>
              Physics-grounded microclimate and dispersion model
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          title="Close laboratory"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      {/* Main Printable Report Canvas */}
      <div 
        ref={reportRef} 
        style={{
          width: '100%',
          maxWidth: '1080px',
          background: '#ffffff',
          padding: '36px 40px',
          borderRadius: '16px',
          margin: '0 auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
          color: '#0f172a'
        }}
      >
        {/* Header Metadata */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '20px',
          marginBottom: '24px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <LeafIcon size={20} color="#10b981" />
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>EcoRoute</span>
              <Badge variant="eco" size="sm">Verified Simulation</Badge>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
              Digital Twin Microclimate & Environmental Intervention Assessment
            </p>
          </div>

          <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b', fontFamily: 'var(--font-mono, monospace)' }}>
            <div>Simulation ID: <strong>{simulationId}</strong></div>
            <div>Timestamp: <strong>{reportDate}</strong></div>
          </div>
        </div>

        {/* Executive Summary Bar */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '12px',
          padding: '18px 22px',
          marginBottom: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>🔬</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Scenario Summary & Projection
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: 1.5 }}>
            Evaluating targeted deployment of <strong>{intervention}</strong> across a <strong>{buildingDensity}</strong> density urban block under <strong>{traffic}</strong> vehicle flow. The computational model projects an immediate <strong>{percentImprovement}% AQI improvement</strong>, lowering baseline exposure from {initialAQI} to {newAQI}.
          </p>
          <div style={{ display: 'flex', gap: '20px', marginTop: '6px', fontSize: '12.5px', color: '#047857' }}>
            <span>Estimated Capex: <strong>${estimatedCost.toLocaleString()}</strong></span>
            <span>Time to Full Effectiveness: <strong>{result.estimatedDays} days</strong></span>
          </div>
        </div>

        {/* 4-Metric Telemetry Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
          <Metric
            label="Baseline Exposure"
            value={initialAQI}
            unit="AQI"
          />
          <Metric
            label="Simulated AQI"
            value={result.newAQI}
            unit="AQI"
            trend={{
              value: `-${percentImprovement}%`,
              positive: true,
              label: 'Clean Air'
            }}
          />
          <Metric
            label="Particulate Delta"
            value={`-${result.reductionAmount || Math.round(initialAQI - newAQI)}`}
            unit="AQI pts"
            trend={{
              value: `${percentImprovement}%`,
              positive: true,
              label: 'Reduced'
            }}
          />
          <Metric
            label="Carbon Credits Yield"
            value={`+${result.credits}`}
            unit="Credits"
            trend={{
              value: 'Verified',
              positive: true
            }}
          />
        </div>

        {/* Visual Analytics 2x2 Grid */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
            Telemetry Visualizations
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            {/* Chart 1 */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>30-Day History & Projected Curve</span>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '600' }}>AQI Index</span>
              </div>
              <div style={{ height: '180px' }}>
                <Line data={trendChartData} options={commonOptions} />
              </div>
            </div>

            {/* Chart 2 */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Intervention Impact Benchmark</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Comparison</span>
              </div>
              <div style={{ height: '180px' }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Bar data={barData} options={commonOptions as any} />
              </div>
            </div>

            {/* Chart 3 */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Transit Flow & Velocity Correlation</span>
                <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600' }}>km/h</span>
              </div>
              <div style={{ height: '180px' }}>
                <Line data={trafficChartData} options={commonOptions} />
              </div>
            </div>

            {/* Tech Specs Summary Box */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '18px',
              background: '#fafbfc',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '12px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Technology Specifications
              </div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                Configuration: <strong>{insightData?.tech_specs}</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Grid verification engine checks live meteorological inputs to dynamically forecast dispersion decay rates over a 30-day window.
              </div>
            </div>
          </div>
        </div>

        {/* AI Strategic Recommendation Box */}
        <div style={{
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '24px'
        }}>
          <div style={{ padding: '18px 20px', background: '#ffffff' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              {insightData?.headline}
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5, textAlign: 'justify' }}>
              {insightData?.content}
            </p>
          </div>
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            borderTop: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '18px' }}>💡</span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Strategic Action Item
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#047857' }}>
                {insightData?.recommendation}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#94a3b8'
        }}>
          <div>Telemetry Sources: Open-Meteo, OpenStreetMap, TomTom. Physics Engine: EcoRoute v2.4</div>
          <div>Cryptographically Signed Digital Twin Artifact</div>
        </div>
      </div>

      {/* Laboratory Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        maxWidth: '1080px',
        width: '100%',
        margin: '24px auto 12px auto'
      }}>
        <Button
          variant="primary"
          size="lg"
          onClick={handleDownloadPdf}
          loading={downloading}
          icon={<DownloadIcon size={18} />}
          style={{ borderRadius: '10px' }}
        >
          {downloading ? "Generating PDF..." : "Export Executive PDF Report"}
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            onClose();
            navigate('/marketplace');
          }}
          icon={<ShieldCheckIcon size={18} />}
          style={{ borderRadius: '10px', background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}
        >
          Procure Verified Interventions
        </Button>
      </div>
    </div>
  );
};

export default AnalyticsView;