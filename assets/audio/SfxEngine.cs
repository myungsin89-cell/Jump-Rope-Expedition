using System;
using System.IO;

public class SfxEngineV2
{
    public const int SAMPLE_RATE = 48000;

    public class Track
    {
        public float[] Left;
        public float[] Right;
        public int Length;

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

    // Modal Resonance Tone (Tines, bells, wood resonance)
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

    // Powerful Textured Noise (Paper rustle, air whoosh, mist)
    public static void AddTexturedNoise(Track t, double start, double duration, double startFreq, double endFreq, float amp, float pan, bool crispSnap = false)
    {
        int sStart = (int)(start * SAMPLE_RATE);
        int total = (int)(duration * SAMPLE_RATE);
        Random rnd = new Random((int)(start * 54321 + startFreq));
        float pL = (float)Math.Cos((pan + 1.0) * Math.PI / 4.0);
        float pR = (float)Math.Sin((pan + 1.0) * Math.PI / 4.0);

        double lpState = 0;

        for (int i = 0; i < total; i++)
        {
            int idx = sStart + i;
            if (idx >= t.Length) break;
            double progress = (double)i / total;

            // Frequency envelope
            double centerFreq = startFreq + (endFreq - startFreq) * Math.Pow(progress, 0.8);
            double rc = 1.0 / (2.0 * Math.PI * centerFreq);
            double dt = 1.0 / SAMPLE_RATE;
            double alpha = dt / (rc + dt);

            double white = rnd.NextDouble() * 2.0 - 1.0;
            // One-pole lowpass
            lpState += alpha * (white - lpState);
            // Highpass
            double hp = white - lpState;

            // Envelope: bell-shaped with sustain
            double env = Math.Sin(progress * Math.PI);
            if (crispSnap && progress < 0.15) env *= (progress / 0.15);

            float s = (float)((lpState * 0.7 + hp * 0.3) * env * amp * 2.2);
            t.AddSample(idx, s * pL, s * pR);
        }
    }

    // Flute Note with gentle breath and vibrato
    public static void AddFluteNote(Track t, double start, double freq, double duration, float amp, float pan)
    {
        int sStart = (int)(start * SAMPLE_RATE);
        int total = (int)(duration * SAMPLE_RATE);
        float pL = (float)Math.Cos((pan + 1.0) * Math.PI / 4.0);
        float pR = (float)Math.Sin((pan + 1.0) * Math.PI / 4.0);
        int attack = (int)(0.04 * SAMPLE_RATE);
        int release = (int)(0.08 * SAMPLE_RATE);
        double phase = 0, vib = 0;

        for (int i = 0; i < total; i++)
        {
            int idx = sStart + i;
            if (idx >= t.Length) break;
            double time = (double)i / SAMPLE_RATE;

            double vibAmp = time > 0.12 ? 0.012 : 0;
            vib += 2.0 * Math.PI * 5.4 / SAMPLE_RATE;
            double curFreq = freq * (1.0 + vibAmp * Math.Sin(vib));
            phase += 2.0 * Math.PI * curFreq / SAMPLE_RATE;

            double sample = Math.Sin(phase) + 0.3 * Math.Sin(2.0 * phase) + 0.12 * Math.Sin(3.0 * phase);
            float env = 1.0f;
            if (i < attack) env = (float)i / attack;
            else if (i > total - release) env = (float)(total - i) / release;

            float s = (float)(sample * env * amp * 0.85);
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
                          + 0.5 * Math.Sin(2.0 * phase) 
                          + 0.25 * Math.Sin(3.0 * phase) 
                          + 0.12 * Math.Sin(4.0 * phase);
            float env = 1.0f;
            if (i < attack) env = (float)i / attack;
            else if (i > total - release) env = (float)(total - i) / release;

            float s = (float)(sample * env * amp * 0.75);
            t.AddSample(idx, s * pL, s * pR);
        }
    }

    // Pluck / String / Harp
    public static void AddPluck(Track t, double start, double freq, double duration, float amp, float pan)
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
            buffer[bIdx] = (float)((val + prev) * 0.5 * 0.993);
            prev = val;
            bIdx = (bIdx + 1) % period;

            float env = 1.0f;
            if (i < 150) env = i / 150f;
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

    // Master with Soft-Saturation and True-Peak Normalization (-1 dBTP)
    public static void MasterAndSave(Track t, string path, float targetPeak = 0.89f, float roomReverb = 0.15f)
    {
        // Stereo room reverb
        if (roomReverb > 0.01f)
        {
            int delayL = (int)(0.038 * SAMPLE_RATE);
            int delayR = (int)(0.052 * SAMPLE_RATE);
            float[] bL = new float[delayL];
            float[] bR = new float[delayR];
            int iL = 0, iR = 0;

            for (int i = 0; i < t.Length; i++)
            {
                float eL = bL[iL];
                float eR = bR[iR];
                bL[iL] = t.Left[i] + eL * 0.40f;
                bR[iR] = t.Right[i] + eR * 0.40f;
                iL = (iL + 1) % delayL;
                iR = (iR + 1) % delayR;

                t.Left[i] = t.Left[i] * (1.0f - roomReverb) + eL * roomReverb;
                t.Right[i] = t.Right[i] * (1.0f - roomReverb) + eR * roomReverb;
            }
        }

        // Soft saturation compressor to bring up body and details
        for (int i = 0; i < t.Length; i++)
        {
            t.Left[i] = (float)Math.Tanh(t.Left[i] * 1.35);
            t.Right[i] = (float)Math.Tanh(t.Right[i] * 1.35);
        }

        // Find peak
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
}
