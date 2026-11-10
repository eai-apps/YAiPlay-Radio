import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WebcamCity } from '../types/radio';
import { WEBCAMS_DATA } from '../constants/webcams';

interface Globe3DCanvasProps {
  selectedCityId: string | null;
  onSelectCity: (city: WebcamCity) => void;
  className?: string;
}

interface ProjectedPoint {
  city: WebcamCity;
  x: number;
  y: number;
  z: number;
  visible: boolean;
  screenX: number;
  screenY: number;
}

export const Globe3DCanvas: React.FC<Globe3DCanvasProps> = ({
  selectedCityId,
  onSelectCity,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Rotation angles (radians)
  const rotationRef = useRef<{ yaw: number; pitch: number }>({ yaw: 0.8, pitch: 0.35 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);
  const hoveredCityRef = useRef<WebcamCity | null>(null);
  const projectedPointsRef = useRef<ProjectedPoint[]>([]);

  const [hoveredCity, setHoveredCity] = useState<WebcamCity | null>(null);

  // Convert Lat/Lng to 3D Cartesian coordinates on unit sphere
  const latLngToCartesian = useCallback((lat: number, lng: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return { x, y, z };
  }, []);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    let height = (canvas.height = Math.min(380, Math.max(300, width * 0.45)));

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth || 700;
      height = canvas.height = Math.min(380, Math.max(300, width * 0.45));
    };

    window.addEventListener('resize', handleResize);

    const radius = Math.min(width, height) * 0.38;
    const centerX = width / 2;
    const centerY = height / 2;

    const render = () => {
      // Auto-rotation when not dragging
      if (!isDraggingRef.current) {
        rotationRef.current.yaw += 0.0035;
      }

      const yaw = rotationRef.current.yaw;
      const pitch = rotationRef.current.pitch;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Globe Atmosphere / Glow Outer Aura
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.7,
        centerX,
        centerY,
        radius * 1.3
      );
      glowGrad.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
      glowGrad.addColorStop(0.5, 'rgba(96, 65, 216, 0.04)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw Globe Sphere Background
      const sphereGrad = ctx.createRadialGradient(
        centerX - radius * 0.35,
        centerY - radius * 0.35,
        radius * 0.1,
        centerX,
        centerY,
        radius
      );
      sphereGrad.addColorStop(0, '#0d1f2d');
      sphereGrad.addColorStop(0.7, '#07121b');
      sphereGrad.addColorStop(1, '#02060b');

      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw Globe Outer Ring Outline
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 4. Draw Meridians and Parallels (Wireframe grid in YAi Cyan)
      ctx.save();
      // Clip to sphere
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();

      const numLatLines = 8;
      for (let i = 1; i < numLatLines; i++) {
        const lat = -90 + (180 / numLatLines) * i;
        const phi = (90 - lat) * (Math.PI / 180);
        const rLat = radius * Math.sin(phi);
        const yLat = radius * Math.cos(phi);

        ctx.strokeStyle =
          lat === 0 ? 'rgba(52, 211, 153, 0.3)' : 'rgba(6, 182, 212, 0.1)';
        ctx.lineWidth = lat === 0 ? 1.2 : 0.75;
        ctx.beginPath();

        // Sample points across longitude
        let first = true;
        for (let lng = -180; lng <= 180; lng += 10) {
          const { x, y, z } = latLngToCartesian(lat, lng, radius);
          // Apply 3D rotation
          // Rotate around Y axis (yaw)
          const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
          const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
          // Rotate around X axis (pitch)
          const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
          const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);

          if (z2 > 0) {
            // Front facing
            const sx = centerX + x1;
            const sy = centerY - y2;
            if (first) {
              ctx.moveTo(sx, sy);
              first = false;
            } else {
              ctx.lineTo(sx, sy);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // Meridians
      const numLngLines = 12;
      for (let i = 0; i < numLngLines; i++) {
        const lng = -180 + (360 / numLngLines) * i;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();

        let first = true;
        for (let lat = -90; lat <= 90; lat += 5) {
          const { x, y, z } = latLngToCartesian(lat, lng, radius);
          const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
          const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
          const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
          const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);

          if (z2 > 0) {
            const sx = centerX + x1;
            const sy = centerY - y2;
            if (first) {
              ctx.moveTo(sx, sy);
              first = false;
            } else {
              ctx.lineTo(sx, sy);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      ctx.restore();

      // 5. Project and Draw Webcam City Markers
      const projected: ProjectedPoint[] = [];

      WEBCAMS_DATA.forEach((city) => {
        let { x, y, z } = latLngToCartesian(city.lat, city.lng, radius);

        // Special handling for ISS: slightly elevated above globe
        if (city.id === 'iss-space') {
          x *= 1.25;
          y *= 1.25;
          z *= 1.25;
        }

        // Apply 3D rotation
        const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
        const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
        const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
        const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);

        const screenX = centerX + x1;
        const screenY = centerY - y2;
        const visible = z2 > -10; // Front or edge facing

        projected.push({
          city,
          x: x1,
          y: y2,
          z: z2,
          visible,
          screenX,
          screenY,
        });
      });

      projectedPointsRef.current = projected;

      // Sort by depth (draw background first, then foreground)
      const sorted = [...projected].sort((a, b) => a.z - b.z);

      sorted.forEach((pt) => {
        if (!pt.visible) return;

        const isSelected = selectedCityId === pt.city.id;
        const isHovered = hoveredCityRef.current?.id === pt.city.id;

        // Opacity depends on depth (front = bright, back edges = dimmed)
        const alpha = Math.max(0.25, Math.min(1, (pt.z + radius * 0.2) / (radius * 1.2)));

        // Marker Halo
        const markerRadius = isSelected ? 8 : isHovered ? 7 : 5;

        // Pulsing ring
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(pt.screenX, pt.screenY, markerRadius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(52, 211, 153, ${alpha * 0.8})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Pin Glow
        const pinGrad = ctx.createRadialGradient(
          pt.screenX,
          pt.screenY,
          0,
          pt.screenX,
          pt.screenY,
          markerRadius * 2
        );
        if (isSelected) {
          pinGrad.addColorStop(0, '#1fcfeb');
          pinGrad.addColorStop(0.6, '#6041d8');
          pinGrad.addColorStop(1, 'rgba(96, 65, 216, 0)');
        } else if (isHovered) {
          pinGrad.addColorStop(0, '#22d3ee');
          pinGrad.addColorStop(0.6, '#06b6d4');
          pinGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        } else {
          pinGrad.addColorStop(0, '#38bdf8');
          pinGrad.addColorStop(0.7, '#0ea5e9');
          pinGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
        }

        ctx.fillStyle = pinGrad;
        ctx.beginPath();
        ctx.arc(pt.screenX, pt.screenY, markerRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Center dot
        ctx.fillStyle = isSelected ? '#ffffff' : '#ecfeff';
        ctx.beginPath();
        ctx.arc(pt.screenX, pt.screenY, markerRadius, 0, Math.PI * 2);
        ctx.fill();

        // City Label (render for selected, hovered, or prominent markers)
        if (pt.z > radius * 0.3 || isSelected || isHovered) {
          ctx.font = isSelected
            ? 'bold 11px system-ui, sans-serif'
            : isHovered
            ? '600 11px system-ui, sans-serif'
            : '500 10px system-ui, sans-serif';
          ctx.fillStyle = isSelected
            ? '#1fcfeb'
            : isHovered
            ? '#22d3ee'
            : `rgba(226, 232, 240, ${alpha * 0.85})`;

          const labelText = `${pt.city.flag} ${pt.city.name.split(' ')[0]}`;
          ctx.fillText(labelText, pt.screenX + markerRadius + 5, pt.screenY + 4);
        }
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [latLngToCartesian, selectedCityId]);

  // Pointer interactions for dragging and rotating
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - lastMouseRef.current.x;
      const deltaY = e.clientY - lastMouseRef.current.y;

      rotationRef.current.yaw += deltaX * 0.007;
      rotationRef.current.pitch = Math.max(
        -1.2,
        Math.min(1.2, rotationRef.current.pitch + deltaY * 0.007)
      );

      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }

    // Check hit test on points
    let foundCity: WebcamCity | null = null;
    for (const pt of projectedPointsRef.current) {
      if (!pt.visible) continue;
      const dist = Math.hypot(pt.screenX - mouseX, pt.screenY - mouseY);
      if (dist < 14) {
        foundCity = pt.city;
        break;
      }
    }

    hoveredCityRef.current = foundCity;
    if (foundCity !== hoveredCity) {
      setHoveredCity(foundCity);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    for (const pt of projectedPointsRef.current) {
      if (!pt.visible) continue;
      const dist = Math.hypot(pt.screenX - mouseX, pt.screenY - mouseY);
      if (dist < 18) {
        onSelectCity(pt.city);
        return;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-950/90 to-zinc-950 border border-cyan-500/20 p-4 shadow-2xl shadow-cyan-950/30 overflow-hidden select-none ${className}`}
    >
      {/* Globe Header Controls & Hint */}
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
            ИНТЕРАКТИВНЫЙ 3D-ГЛОБУС YAi LIVE
          </span>
        </div>
        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
          <span>👆 Вращайте глобус мышью и нажимайте на светящиеся точки городов</span>
        </div>
      </div>

      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        className="w-full cursor-grab active:cursor-grabbing block mx-auto touch-none"
      />

      {/* Bottom Floating City Indicator if hovered */}
      {hoveredCity && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-md border border-cyan-500/40 px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-xs text-white animate-fade-in pointer-events-none">
          <span className="text-base">{hoveredCity.flag}</span>
          <span className="font-bold">{hoveredCity.name}</span>
          <span className="text-[10px] text-cyan-400 font-mono">[{hoveredCity.tagline}]</span>
        </div>
      )}
    </div>
  );
};
