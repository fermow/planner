import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  delay: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  life: number;
}

export default function StarBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let stars: Star[] = [];
    let particles: Particle[] = [];
    let mouseX = 0;
    let mouseY = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initStars = () => {
      stars = [];
      const isMobile = window.innerWidth < 768;
      const density = isMobile ? 12000 : 4000;
      const count = Math.floor((canvas.width * canvas.height) / density);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.8 + 0.2,
          speed: Math.random() * 0.02 + 0.005,
          delay: Math.random() * Math.PI * 2,
        });
      }
    };

    const createParticles = (x: number, y: number) => {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        particles.push({
          x,
          y,
          size: Math.random() * 2 + 1,
          vx: Math.cos(angle) * (Math.random() * 1 + 0.5),
          vy: Math.sin(angle) * (Math.random() * 1 + 0.5),
          life: 1,
        });
      }
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw stars
      for (const star of stars) {
        const twinkle = Math.sin(time * star.speed + star.delay) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`;
        ctx.fill();

        // Glow for brighter stars
        if (star.size > 1.5) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 220, 255, ${star.opacity * twinkle * 0.15})`;
          ctx.fill();
        }
      }

      // Shooting star occasionally (less on mobile)
      const shootingStarChance = window.innerWidth < 768 ? 0.0003 : 0.001;
      if (Math.random() < shootingStarChance) {
        const sx = Math.random() * canvas.width;
        const sy = Math.random() * canvas.height * 0.5;
        createParticles(sx, sy);
      }

      // Update and draw particles
      particles = particles.filter((p) => p.life > 0);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${p.life * 0.8})`;
        ctx.fill();
      }

      // Mouse-reactive subtle glow (desktop only)
      if (window.innerWidth >= 768) {
        const gradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 300);
        gradient.addColorStop(0, 'rgba(64, 224, 208, 0.03)');
        gradient.addColorStop(1, 'rgba(64, 224, 208, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationId = requestAnimationFrame(animate);
    };

    resize();
    initStars();

    const onResize = () => {
      resize();
      initStars();
    };

    const onMouse = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouse);
    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="starry-canvas fixed inset-0 z-0 pointer-events-none"
      style={{ background: 'linear-gradient(180deg, #050510 0%, #0a0a1a 40%, #12122a 70%, #1a1a3e 100%)' }}
    />
  );
}
