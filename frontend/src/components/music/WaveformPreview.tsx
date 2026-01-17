import { useEffect, useRef } from "react";

interface WaveformPreviewProps {
  file: File;
}

export default function WaveformPreview({ file }: WaveformPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const reader = new FileReader();

    reader.onload = e => {
      const data = e.target?.result as ArrayBuffer;
      audioContext.decodeAudioData(data, buffer => {
        drawWaveform(buffer);
      });
    };

    reader.readAsArrayBuffer(file);

    const drawWaveform = (buffer: AudioBuffer) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const data = buffer.getChannelData(0);
      const step = Math.ceil(data.length / width);
      const amp = (height / 2) * 0.8;

      // Clear canvas with dark background
      ctx.fillStyle = "rgba(15, 23, 42, 0.5)";
      ctx.fillRect(0, 0, width, height);

      // Draw waveform with gradient
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#f97316");
      gradient.addColorStop(0.5, "#f43f5e");
      gradient.addColorStop(1, "#3b82f6");

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();

      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;

        for (let j = 0; j < step; j++) {
          const datum = data[i * step + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }

        if (i === 0) {
          ctx.moveTo(i, height / 2 - max * amp);
        } else {
          ctx.lineTo(i, height / 2 - max * amp);
        }
      }

      ctx.stroke();

      // Draw bottom mirror
      ctx.beginPath();
      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;

        for (let j = 0; j < step; j++) {
          const datum = data[i * step + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }

        if (i === 0) {
          ctx.moveTo(i, height / 2 - min * amp);
        } else {
          ctx.lineTo(i, height / 2 - min * amp);
        }
      }

      ctx.stroke();
    };
  }, [file]);

  return (
    <div className="rounded-lg border border-slate-600 bg-slate-700/30 p-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={120}
        className="w-full rounded"
      />
    </div>
  );
}
