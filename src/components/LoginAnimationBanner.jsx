import { useRef, useEffect } from "react";
import "./LoginAnimationBanner.css";
import {
  CalendarDays,
  CheckSquare,
  ShieldCheck,
  Activity,
} from "lucide-react";

export default function LoginAnimationBanner() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;

    // Resize handler
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Create Constellation Nodes
    const particleCount = 28;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * (width || 600),
        y: Math.random() * (height || 800),
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2.5 + 2.5, // 2.5px to 5px
        baseAlpha: Math.random() * 0.4 + 0.6,
      });
    }

    // Interactive mouse listeners
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
    }

    // Animation Loop
    const maxDistance = 210;
    const mouseDistance = 230;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Update particle positions
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Bounce smoothly off boundaries
        if (p.x < 10) { p.x = 10; p.vx *= -1; }
        if (p.x > width - 10) { p.x = width - 10; p.vx *= -1; }
        if (p.y < 10) { p.y = 10; p.vy *= -1; }
        if (p.y > height - 10) { p.y = height - 10; p.vy *= -1; }
      }

      // Draw Connecting Lines Between Nodes
      ctx.lineWidth = 1.2;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.45;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Connect Nodes to Mouse Position
      if (mouseRef.current.active && mouseRef.current.x !== null) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        for (let i = 0; i < particles.length; i++) {
          const dx = particles[i].x - mx;
          const dy = particles[i].y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseDistance) {
            const alpha = (1 - dist / mouseDistance) * 0.65;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mx, my);
            ctx.stroke();
          }
        }
      }

      // Draw Glowing Nodes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Soft Outer Glow Halo
        ctx.save();
        ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
        ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(255, 255, 255, ${p.baseAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="ems-constellation-banner">
      {/* Interactive Constellation Canvas */}
      <canvas ref={canvasRef} className="constellation-canvas" />

      {/* Atmospheric Radial Shimmer Overlays */}
      <div className="constellation-ambient-shimmer" />

      {/* Foreground Content */}
      <div className="constellation-content">
        {/* Top Header Badge */}
        <div className="constellation-header">
          <div className="constellation-badge">
            <span className="badge-live-dot" />
            <span>EMS — Employee Management System</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="constellation-hero">
          <h1 className="constellation-headline">
            Manage People.
            <br />
            Simplify Operations.
            <br />
            Build a Better Workplace.
          </h1>

          <p className="constellation-subtext">
            The unified platform for leave management, task workflows, team calendars, role permissions, and day-to-day workforce operations.
          </p>

          {/* Feature List with Glass Icons */}
          <div className="constellation-features">
            <div className="constellation-feature-item">
              <div className="feature-icon-box">
                <CalendarDays size={17} />
              </div>
              <span>Leave Management, Approvals & Team Calendar</span>
            </div>

            <div className="constellation-feature-item">
              <div className="feature-icon-box">
                <CheckSquare size={17} />
              </div>
              <span>Task Tracking, Sprints & Milestone Delivery</span>
            </div>

            <div className="constellation-feature-item">
              <div className="feature-icon-box">
                <ShieldCheck size={17} />
              </div>
              <span>Role-Based Access Control & Multi-Tier Approvals</span>
            </div>

            <div className="constellation-feature-item">
              <div className="feature-icon-box">
                <Activity size={17} />
              </div>
              <span>Real-Time Audit Ledger & Operational Activity Logs</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="constellation-footer">
          <span>© 2026 EMS — Employee Management System. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}
