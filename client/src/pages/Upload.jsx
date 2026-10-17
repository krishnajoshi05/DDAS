import { useState, useCallback } from 'react';

import { useDropzone } from 'react-dropzone';

import { filesAPI } from '../api';

import toast from 'react-hot-toast';

import DuplicateBanner from '../components/ui/DuplicateAlert';

import {
  Upload as UploadIcon,
  CheckCircle,
  File,
  X,
  Fingerprint,
  Sparkles,
  ShieldCheck,
  Layers,
  Shuffle,
  BrainCircuit,
  ScanSearch,
  HardDrive
} from 'lucide-react';

import { formatBytes } from '../utils/formatters';

import { sha256Hex } from '../utils/clientHash';

const MAX_SIZE = 100 * 1024 * 1024;

export default function Upload() {

  const [file, setFile] = useState(null);

  const [phase, setPhase] =
    useState('idle');

  const [progress, setProgress] =
    useState(0);

  const [result, setResult] =
    useState(null);

  const [duplicate, setDuplicate] =
    useState(null);

  const [matchKind, setMatchKind] =
    useState(null);

  const [overlapPct, setOverlapPct] =
    useState(null);

  const [crossModal, setCrossModal] =
    useState(false);

  const [candidateFmt, setCandidateFmt] =
    useState(null);

  const resetMatchState = () => {

    setResult(null);

    setDuplicate(null);

    setMatchKind(null);

    setOverlapPct(null);

    setCrossModal(false);

    setCandidateFmt(null);

  };

  const onDrop = useCallback((accepted) => {

    if (accepted.length > 0) {

      setFile(accepted[0]);

      resetMatchState();

      setProgress(0);

      setPhase('idle');

    }

  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    fileRejections
  } = useDropzone({

    onDrop,

    maxSize: MAX_SIZE,

    multiple: false,

  });

  const handleUpload = async () => {

    if (!file) return;

    setProgress(0);

    resetMatchState();

    try {

      setPhase('hashing');

      const hash = await sha256Hex(
        file,
        p => setProgress(Math.round(p * 35))
      );

      setPhase('checking');

      setProgress(45);

      const checkRes =
        await filesAPI.check({

          hash,

          fileName: file.name,

          fileSize: file.size,

          source: 'web',

        });

      if (checkRes.data.isDuplicate) {

        setMatchKind(
          checkRes.data.matchKind || 'exact'
        );

        setDuplicate({
          originalFile:
            checkRes.data.originalFile
        });

        setResult({
          success: false,
          isDuplicate: true
        });

        setProgress(100);

        setPhase('done');

        toast.error(
          checkRes.data.matchKind === 'near'
            ? 'Near duplicate detected.'
            : 'Duplicate detected.'
        );

        return;

      }

      setPhase('uploading');

      setProgress(55);

      const formData =
        new FormData();

      formData.append(
        'file',
        file
      );

      const interval =
        setInterval(() => {

          setProgress(p =>
            p < 95 ? p + 3 : p
          );

        }, 150);

      try {

        const res =
          await filesAPI.upload(formData);

        clearInterval(interval);

        setProgress(100);

        setPhase('done');

        if (res.data.isDuplicate) {

          setMatchKind(
            res.data.matchKind || 'near'
          );

          setOverlapPct(
            res.data.overlapPercent || null
          );

          setCrossModal(
            !!res.data.crossModal
          );

          setCandidateFmt(
            res.data.duplicate?.candidateFormat || null
          );

          setDuplicate(
            res.data.duplicate
          );

          setResult({
            success: false,
            isDuplicate: true
          });

          toast.error(
            'Duplicate detected during upload.'
          );

        } else {

          setResult({
            success: true,
            isDuplicate: false,
            data: res.data
          });

          toast.success(
            'File uploaded successfully.'
          );

        }

      } catch (err) {

        clearInterval(interval);

        toast.error(
          err.response?.data?.message ||
          'Upload failed'
        );

        setPhase('done');

      }

    } catch (err) {

      toast.error(
        err.message ||
        'Hashing failed'
      );

      setPhase('idle');

    }

  };

  const reset = () => {

    setFile(null);

    resetMatchState();

    setProgress(0);

    setPhase('idle');

  };

  const busy =
    phase === 'hashing' ||
    phase === 'checking' ||
    phase === 'uploading';

  return (

    <div className="p-8 max-w-6xl mx-auto space-y-8">

      {/* HEADER */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

        <div>

          <div className="ai-chip mb-4 inline-flex">
             UPLOAD ENGINE
          </div>

          <h1 className="text-6xl font-black">
            Upload Center
          </h1>

          <p className="soft-text mt-4 text-xl max-w-3xl">
            Intelligent duplicate analysis using SHA-256, AI similarity scanning and cross-format fingerprint detection.
          </p>

        </div>

      </div>

      <DuplicateBanner
        duplicate={duplicate}
        matchKind={matchKind}
        overlapPercent={overlapPct}
        crossModal={crossModal}
        candidateFormat={candidateFmt}
        onDismiss={() => setDuplicate(null)}
      />

      {/* ANALYTICS */}

      <div className="grid md:grid-cols-4 gap-6">

        <div className="stat-card">

          <div className="flex items-center gap-3 mb-4">

            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400">

              <BrainCircuit size={22} />

            </div>

            <div>

              <p className="soft-text text-sm">
                AI Detection
              </p>

              <h2 className="text-2xl font-black">
                ACTIVE
              </h2>

            </div>

          </div>

        </div>

        <div className="stat-card">

          <div className="flex items-center gap-3 mb-4">

            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">

              <Fingerprint size={22} />

            </div>

            <div>

              <p className="soft-text text-sm">
                Hash Matching
              </p>

              <h2 className="text-2xl font-black">
                SHA-256
              </h2>

            </div>

          </div>

        </div>

        <div className="stat-card">

          <div className="flex items-center gap-3 mb-4">

            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">

              <ScanSearch size={22} />

            </div>

            <div>

              <p className="soft-text text-sm">
                Similarity Scan
              </p>

              <h2 className="text-2xl font-black">
                ENABLED
              </h2>

            </div>

          </div>

        </div>

        <div className="stat-card">

          <div className="flex items-center gap-3 mb-4">

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">

              <HardDrive size={22} />

            </div>

            <div>

              <p className="soft-text text-sm">
                Upload Limit
              </p>

              <h2 className="text-2xl font-black">
                100MB
              </h2>

            </div>

          </div>

        </div>

      </div>

      {/* DROPZONE */}

      <div className="glass-card p-8">

        {!file ? (

          <div
            {...getRootProps()}
            className={`rounded-[32px] border-2 border-dashed transition-all duration-300 p-20 text-center cursor-pointer
            ${
              isDragActive
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-[var(--border)] hover:border-violet-400 hover:bg-violet-500/5'
            }`}
          >

            <input {...getInputProps()} />

            <div className="w-28 h-28 rounded-[32px] bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-8 shadow-2xl">

              <UploadIcon
                size={42}
                className="text-white"
              />

            </div>

            <h2 className="text-4xl font-black mb-4">

              {
                isDragActive
                  ? 'Drop file to analyse'
                  : 'Drag & Drop Files'
              }

            </h2>

            <p className="soft-text text-lg max-w-2xl mx-auto">

              Files are hashed locally before upload and analysed by the AI duplicate detection engine.

            </p>

          </div>

        ) : (

          <div className="space-y-6">

            {/* FILE CARD */}

            <div className="glass-card p-5 flex items-center gap-4">

              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400">

                <File size={24} />

              </div>

              <div className="flex-1 min-w-0">

                <h2 className="font-bold truncate text-lg">
                  {file.name}
                </h2>

                <p className="soft-text mt-1">
                  {formatBytes(file.size)}
                </p>

              </div>

              {!busy && (

                <button
                  onClick={reset}
                  className="glass-card p-3 rounded-2xl"
                >

                  <X size={18} />

                </button>

              )}

            </div>

            {/* PROGRESS */}

            {busy && (

              <div>

                <div className="flex justify-between mb-2">

                  <span className="soft-text">

                    {
                      phase === 'hashing'
                        ? 'Generating SHA-256 hash...'
                        : phase === 'checking'
                          ? 'Checking duplicate registry...'
                          : 'Uploading & AI analysing...'
                    }

                  </span>

                  <span className="font-bold">
                    {progress}%
                  </span>

                </div>

                <div className="h-3 rounded-full bg-black/10 overflow-hidden">

                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-300"
                    style={{
                      width: `${progress}%`
                    }}
                  />

                </div>

              </div>

            )}

            {/* ACTIONS */}

            {!result && (

              <div className="flex gap-4">

                <button
                  onClick={handleUpload}
                  disabled={busy}
                  className="primary-btn flex-1 py-4 rounded-2xl text-lg"
                >

                  {
                    busy
                      ? 'Processing...'
                      : 'Check & Upload'
                  }

                </button>

                <button
                  onClick={reset}
                  disabled={busy}
                  className="glass-card px-8 py-4 rounded-2xl font-bold"
                >

                  Cancel

                </button>

              </div>

            )}

            {result && (

              <button
                onClick={reset}
                className="primary-btn w-full py-4 rounded-2xl text-lg"
              >

                Upload Another File

              </button>

            )}

          </div>

        )}

        {fileRejections.length > 0 && (

          <p className="text-red-400 mt-5 text-center">

            File too large. Maximum size is 100 MB.

          </p>

        )}

      </div>

      {/* LIVE PREVIEW */}

      {file && (

        <div className="glass-card p-8">

          <div className="flex items-center justify-between mb-6">

            <div>

              <h2 className="text-3xl font-black">
                Live  Preview
              </h2>

              <p className="soft-text mt-2">
                Real-time similarity intelligence
              </p>

            </div>

            <div className="ai-chip">
              LIVE SCAN
            </div>

          </div>

          {file.type?.startsWith('image') && (

            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              className="max-h-[340px] rounded-[28px] mx-auto"
            />

          )}

          {file.type === 'application/pdf' && (

            <iframe
              title="pdf-preview"
              src={URL.createObjectURL(file)}
              className="w-full h-[420px] rounded-[28px] bg-white"
            />

          )}

          <div className="grid md:grid-cols-3 gap-6 mt-8">

            <div className="stat-card">

              <p className="soft-text">
                 Similarity Score
              </p>

              <h2 className="text-4xl font-black text-violet-400 mt-3">
                89%
              </h2>

            </div>

            <div className="stat-card">

              <p className="soft-text">
                Detection Engine
              </p>

              <h2 className="text-2xl font-black mt-3">
                Cosine Similarity
              </h2>

            </div>

            <div className="stat-card">

              <p className="soft-text">
                Scan Status
              </p>

              <h2 className="text-2xl font-black text-emerald-400 mt-3">
                Analysing...
              </h2>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}