using System;
using System.IO;

public class BattleAudioEngineV2
{
    public const int SAMPLE_RATE = 48000;

    public class Track
    {
        public float[] Left;
        public float[] Right;
        public int Length;

        public Track(int length)
        {
            Length = length;
            Left = new float[length];
            Right = new float[length];
        }

        public Track(double durationSeconds)
        {
            Length = (int)(durationSeconds * SAMPLE_RATE);
            Left = new float[Length];
            Right = new float[Length];
        }

        public void AddSample(int idx, float l, float r)
        {
            if (idx >= 0 && idx < Length)
            {
                Left[idx] += l;
                Right[idx] += r;
            }
        }
    }

    // Modal Bell / Wood / Membrane resonance
    public static void AddModalTone(Track t, double start, double freq, double duration, double decay, float amp, float pan)
    {
        int sStart = (int)(start * SAMPLE_RATE);
        int total = (int)(duration * SAMPLE_RATE);
        float pL = (float)Math.Cos((pan + 1.0) * Math.PI / 4.0);
        float pR = (float)Math.Sin((pan + 1.0) * Math.PI / 4.0);
        double phase = 0;

        for (int i = 0; i < total; i++)
        {
            int idx = sStart + i;
            if (idx >= t.Length) break;
            double time = (double)i / SAMPLE_RATE;
            phase += 2.0 * Math.PI * freq / SAMPLE_RATE;
            double env = Math.Exp(-decay * time);
            float s = (float)(Math.Sin(phase) * env * amp);
            t.AddSample(idx, s * pL, s * pR);
        }
    }

    // Textured Noise / Air / Impact / Burst
    public static void AddNoiseBurst(Track t, double start, double duration, double startFreq, double endFreq, float amp, float pan, bool pitchSweep = false)
    {
        int sStart = (int)(start * SAMPLE_RATE);
        int total = (int)(duration * SAMPLE_RATE);
        Random rnd = new Random((int)(start * 7771 + startFreq));
        float pL = (float)Math.Cos((pan + 1.0) * Math.PI / 4.0);
        float pR = (float)Math.Sin((pan + 1.0) * Math.PI / 4.0);
        double lp = 0;

        for (int i = 0; i < total; i++)
        {
            int idx = sStart + i;
            if (idx >= t.Length) break;
            double prog = (double)i / total;

            double curFreq = pitchSweep ? (startFreq + (endFreq - startFreq) * prog) : startFreq;
            double rc = 1.0 / (2.0 * Math.PI * curFreq);
            double dt = 1.0 / SAMPLE_RATE;
            double alpha = dt / (rc + dt);

            double white = rnd.NextDouble() * 2.0 - 1.0;
            lp += alpha * (white - lp);
            double hp = white - lp;

            double env = Math.Sin(prog * Math.PI);
            float s = (float)((lp * 0.6 + hp * 0.4) * env * amp * 2.2);
            t.AddSample(idx, s * pL, s * pR);
        }
    }

    // Brass / Horn Note with rich harmonics
    public static void AddHornNote(Track t, double start, double freq, double duration, float amp, float pan)
    {
        int sStart = (int)(start * SAMPLE_RATE);
        int total = (int)(duration * SAMPLE_RATE);
        float pL = (float)Math.Cos((pan + 1.0) * Math.PI / 4.0);
        float pR = (float)Math.Sin((pan + 1.0) * Math.PI / 4.0);
        int attack = (int)(0.04 * SAMPLE_RATE);
        int release = (int)(0.08 * SAMPLE_RATE);
        double phase = 0;

        for (int i = 0; i < total; i++)
        {
            int idx = sStart + i;
            if (idx >= t.Length) break;
            phase += 2.0 * Math.PI * freq / SAMPLE_RATE;

            double sample = Math.Sin(phase) 
                          + 0.52 * Math.Sin(2.0 * phase) 
                          + 0.28 * Math.Sin(3.0 * phase) 
                          + 0.14 * Math.Sin(4.0 * phase);

            float env = 1.0f;
            if (i < attack) env = (float)i / attack;
            else if (i > total - release) env = (float)(total - i) / release;

            float s = (float)(sample * env * amp * 0.75);
            t.AddSample(idx, s * pL, s * pR);
        }
    }

    // Flute Note with gentle vibrato
    public static void AddFluteNote(Track t, double start, double freq, double duration, float amp, float pan)
    {
        int sStart = (int)(start * SAMPLE_RATE);
        int total = (int)(duration * SAMPLE_RATE);
        float pL = (float)Math.Cos((pan + 1.0) * Math.PI / 4.0);
        float pR = (float)Math.Sin((pan + 1.0) * Math.PI / 4.0);
        int attack = (int)(0.03 * SAMPLE_RATE);
        int release = (int)(0.07 * SAMPLE_RATE);
        double phase = 0, vib = 0;

        for (int i = 0; i < total; i++)
        {
            int idx = sStart + i;
            if (idx >= t.Length) break;
            double time = (double)i / SAMPLE_RATE;

            double vibAmp = time > 0.12 ? 0.012 : 0;
            vib += 2.0 * Math.PI * 5.5 / SAMPLE_RATE;
            double curFreq = freq * (1.0 + vibAmp * Math.Sin(vib));
            phase += 2.0 * Math.PI * curFreq / SAMPLE_RATE;

            double sample = Math.Sin(phase) + 0.3 * Math.Sin(2.0 * phase) + 0.1 * Math.Sin(3.0 * phase);
            float env = 1.0f;
            if (i < attack) env = (float)i / attack;
            else if (i > total - release) env = (float)(total - i) / release;

            float s = (float)(sample * env * amp * 0.85);
            t.AddSample(idx, s * pL, s * pR);
        }
    }

    // Pluck / String / Bass
    public static void AddPluck(Track t, double start, double freq, double duration, float amp, float pan, double decay = 0.992)
    {
        int sStart = (int)(start * SAMPLE_RATE);
        int period = Math.Max(2, (int)(SAMPLE_RATE / freq));
        float[] buffer = new float[period];
        Random rnd = new Random((int)(start * 3333 + freq));
        for (int i = 0; i < period; i++) buffer[i] = (float)(rnd.NextDouble() * 2.0 - 1.0);

        int total = (int)(duration * SAMPLE_RATE);
        int bIdx = 0;
        float prev = 0f;
        float pL = (float)Math.Cos((pan + 1.0) * Math.PI / 4.0);
        float pR = (float)Math.Sin((pan + 1.0) * Math.PI / 4.0);

        for (int i = 0; i < total; i++)
        {
            int idx = sStart + i;
            if (idx >= t.Length) break;
            float val = buffer[bIdx];
            buffer[bIdx] = (float)((val + prev) * 0.5 * decay);
            prev = val;
            bIdx = (bIdx + 1) % period;

            float env = 1.0f;
            if (i < 120) env = i / 120f;
            float tail = SAMPLE_RATE * 0.04f;
            if (i > total - tail) env *= (total - i) / tail;

            float s = val * env * amp;
            t.AddSample(idx, s * pL, s * pR);
        }
    }

    // Warm Ambient Pad Chord
    public static void AddPadChord(Track t, double start, double[] freqs, double duration, float amp)
    {
        int sStart = (int)(start * SAMPLE_RATE);
        int total = (int)(duration * SAMPLE_RATE);
        int attack = (int)(0.15 * SAMPLE_RATE);
        int release = (int)(0.25 * SAMPLE_RATE);

        double[] phases = new double[freqs.Length];

        for (int i = 0; i < total; i++)
        {
            int idx = sStart + i;
            if (idx >= t.Length) break;

            float env = 1.0f;
            if (i < attack) env = (float)i / attack;
            else if (i > total - release) env = (float)(total - i) / release;

            double sum = 0;
            for (int f = 0; f < freqs.Length; f++)
            {
                phases[f] += 2.0 * Math.PI * freqs[f] / SAMPLE_RATE;
                sum += Math.Sin(phases[f]) + 0.3 * Math.Sin(2.0 * phases[f]);
            }

            float s = (float)(sum / freqs.Length * env * amp * 0.7);
            t.AddSample(idx, s, s);
        }
    }

    // War Drum / Mallet Kick Impact
    public static void AddWarDrum(Track t, double start, float amp, float pan)
    {
        int sStart = (int)(start * SAMPLE_RATE);
        int total = (int)(0.35 * SAMPLE_RATE);
        double phase = 0;
        float pL = (float)Math.Cos((pan + 1.0) * Math.PI / 4.0);
        float pR = (float)Math.Sin((pan + 1.0) * Math.PI / 4.0);

        for (int i = 0; i < total; i++)
        {
            int idx = sStart + i;
            if (idx >= t.Length) break;
            double time = (double)i / SAMPLE_RATE;
            double freq = 95.0 * Math.Exp(-18.0 * time);
            phase += 2.0 * Math.PI * freq / SAMPLE_RATE;
            double env = Math.Exp(-14.0 * time);
            float s = (float)(Math.Sin(phase) * env * amp * 0.9);
            t.AddSample(idx, s * pL, s * pR);
        }
    }

    public static void PostProcess(Track t, float roomReverb = 0.18f, float targetPeak = 0.89f)
    {
        if (roomReverb > 0.01f)
        {
            int delayL = (int)(0.040 * SAMPLE_RATE);
            int delayR = (int)(0.055 * SAMPLE_RATE);
            float[] bL = new float[delayL];
            float[] bR = new float[delayR];
            int iL = 0, iR = 0;

            for (int i = 0; i < t.Length; i++)
            {
                float eL = bL[iL];
                float eR = bR[iR];
                bL[iL] = t.Left[i] + eL * 0.42f;
                bR[iR] = t.Right[i] + eR * 0.42f;
                iL = (iL + 1) % delayL;
                iR = (iR + 1) % delayR;

                t.Left[i] = t.Left[i] * (1.0f - roomReverb) + eL * roomReverb;
                t.Right[i] = t.Right[i] * (1.0f - roomReverb) + eR * roomReverb;
            }
        }

        for (int i = 0; i < t.Length; i++)
        {
            t.Left[i] = (float)Math.Tanh(t.Left[i] * 1.30);
            t.Right[i] = (float)Math.Tanh(t.Right[i] * 1.30);
        }

        float maxPeak = 0.0001f;
        for (int i = 0; i < t.Length; i++)
        {
            float aL = Math.Abs(t.Left[i]);
            float aR = Math.Abs(t.Right[i]);
            if (aL > maxPeak) maxPeak = aL;
            if (aR > maxPeak) maxPeak = aR;
        }

        float gain = targetPeak / maxPeak;
        for (int i = 0; i < t.Length; i++)
        {
            t.Left[i] = Math.Max(-1.0f, Math.Min(1.0f, t.Left[i] * gain));
            t.Right[i] = Math.Max(-1.0f, Math.Min(1.0f, t.Right[i] * gain));
        }
    }

    // Master Normalization with Soft Saturation (-1 dBTP)
    public static void MasterAndSave(Track t, string path, float targetPeak = 0.89f, float roomReverb = 0.18f)
    {
        if (roomReverb > 0.01f)
        {
            int delayL = (int)(0.040 * SAMPLE_RATE);
            int delayR = (int)(0.055 * SAMPLE_RATE);
            float[] bL = new float[delayL];
            float[] bR = new float[delayR];
            int iL = 0, iR = 0;

            for (int i = 0; i < t.Length; i++)
            {
                float eL = bL[iL];
                float eR = bR[iR];
                bL[iL] = t.Left[i] + eL * 0.42f;
                bR[iR] = t.Right[i] + eR * 0.42f;
                iL = (iL + 1) % delayL;
                iR = (iR + 1) % delayR;

                t.Left[i] = t.Left[i] * (1.0f - roomReverb) + eL * roomReverb;
                t.Right[i] = t.Right[i] * (1.0f - roomReverb) + eR * roomReverb;
            }
        }

        // Tanh soft saturation
        for (int i = 0; i < t.Length; i++)
        {
            t.Left[i] = (float)Math.Tanh(t.Left[i] * 1.30);
            t.Right[i] = (float)Math.Tanh(t.Right[i] * 1.30);
        }

        float maxPeak = 0.0001f;
        for (int i = 0; i < t.Length; i++)
        {
            float aL = Math.Abs(t.Left[i]);
            float aR = Math.Abs(t.Right[i]);
            if (aL > maxPeak) maxPeak = aL;
            if (aR > maxPeak) maxPeak = aR;
        }

        float gain = targetPeak / maxPeak;
        int fade = Math.Min(t.Length / 10, (int)(0.004 * SAMPLE_RATE));

        using (FileStream fs = new FileStream(path, FileMode.Create))
        using (BinaryWriter bw = new BinaryWriter(fs))
        {
            int subChunk2Size = t.Length * 2 * sizeof(short);
            int chunkSize = 36 + subChunk2Size;

            bw.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));
            bw.Write(chunkSize);
            bw.Write(System.Text.Encoding.ASCII.GetBytes("WAVE"));

            bw.Write(System.Text.Encoding.ASCII.GetBytes("fmt "));
            bw.Write(16);
            bw.Write((short)1);
            bw.Write((short)2);
            bw.Write(SAMPLE_RATE);
            bw.Write(SAMPLE_RATE * 2 * sizeof(short));
            bw.Write((short)(2 * sizeof(short)));
            bw.Write((short)16);

            bw.Write(System.Text.Encoding.ASCII.GetBytes("data"));
            bw.Write(subChunk2Size);

            for (int i = 0; i < t.Length; i++)
            {
                float env = 1.0f;
                if (i < fade) env = (float)i / fade;
                else if (i > t.Length - fade) env = (float)(t.Length - i) / fade;

                short sL = (short)(Math.Max(-1.0f, Math.Min(1.0f, t.Left[i] * gain * env)) * 32767f);
                short sR = (short)(Math.Max(-1.0f, Math.Min(1.0f, t.Right[i] * gain * env)) * 32767f);
                bw.Write(sL);
                bw.Write(sR);
            }
        }
    }

    public static void WriteWav(Track t, string path)
    {
        using (FileStream fs = new FileStream(path, FileMode.Create))
        using (BinaryWriter bw = new BinaryWriter(fs))
        {
            int subChunk2Size = t.Length * 2 * sizeof(short);
            int chunkSize = 36 + subChunk2Size;

            bw.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));
            bw.Write(chunkSize);
            bw.Write(System.Text.Encoding.ASCII.GetBytes("WAVE"));

            bw.Write(System.Text.Encoding.ASCII.GetBytes("fmt "));
            bw.Write(16);
            bw.Write((short)1);
            bw.Write((short)2);
            bw.Write(SAMPLE_RATE);
            bw.Write(SAMPLE_RATE * 2 * sizeof(short));
            bw.Write((short)(2 * sizeof(short)));
            bw.Write((short)16);

            bw.Write(System.Text.Encoding.ASCII.GetBytes("data"));
            bw.Write(subChunk2Size);

            for (int i = 0; i < t.Length; i++)
            {
                short sL = (short)(Math.Max(-1.0f, Math.Min(1.0f, t.Left[i])) * 32767f);
                short sR = (short)(Math.Max(-1.0f, Math.Min(1.0f, t.Right[i])) * 32767f);
                bw.Write(sL);
                bw.Write(sR);
            }
        }
    }
}
