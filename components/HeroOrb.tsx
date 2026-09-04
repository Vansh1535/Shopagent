'use client';

import { useEffect, useRef } from 'react';

export default function HeroOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = 500);
    let height = (canvas.height = 500);

    const particles: Array<{
      x: number;
      y: number;
      z: number;
      baseX: number;
      baseY: number;
      baseZ: number;
      size: number;
      alpha: number;
    }> = [];

    const radius = 170;
    const count = 750;

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      particles.push({
        x,
        y,
        z,
        baseX: x,
        baseY: y,
        baseZ: z,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.7 + 0.3,
      });
    }

    let angleY = 0;
    let angleX = 0.2;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Draw background warm glow gradient behind orb
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        40,
        centerX,
        centerY,
        240
      );
      glowGrad.addColorStop(0, 'rgba(238, 178, 92, 0.45)');
      glowGrad.addColorStop(0.4, 'rgba(180, 80, 150, 0.25)');
      glowGrad.addColorStop(0.7, 'rgba(70, 30, 90, 0.15)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 240, 0, Math.PI * 2);
      ctx.fill();

      // Outer golden orb perimeter ring
      ctx.strokeStyle = 'rgba(229, 193, 120, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 25, 0, Math.PI * 2);
      ctx.stroke();

      angleY += 0.005;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      // Render 3D particle sphere
      for (let p of particles) {
        // Rotate Y
        let x1 = p.baseX * cosY - p.baseZ * sinY;
        let z1 = p.baseZ * cosY + p.baseX * sinY;

        // Rotate X
        let y1 = p.baseY * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.baseY * sinX;

        const scale = 300 / (300 + z2);
        const screenX = centerX + x1 * scale;
        const screenY = centerY + y1 * scale;

        const alpha = Math.max(0.1, (z2 + radius) / (2 * radius));

        ctx.fillStyle = z2 > 0 ? `rgba(243, 211, 140, ${alpha * 0.95})` : `rgba(160, 90, 140, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, p.size * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative flex items-center justify-center w-full max-w-[500px] aspect-square mx-auto">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
