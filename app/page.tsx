"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

type BuildStatus = "idle" | "working" | "success" | "error";

const defaultFormState = {
  appName: "MyApplication",
  version: "1.0.0",
  entryPoint: "main.py",
  base: "console",
  iconPath: "",
  includes: "",
  excludes: "",
  includeFiles: "",
  targetName: "",
};

export default function HomePage() {
  const [formState, setFormState] = useState(defaultFormState);
  const [status, setStatus] = useState<BuildStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedArchive, setSelectedArchive] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isBusy = status === "working";

  const dropLabel = useMemo(() => {
    if (selectedArchive) {
      return `Selected: ${selectedArchive.name}`;
    }

    return "Drag & drop a zipped Python project (with requirements) or click to browse";
  }, [selectedArchive]);

  const handleArchiveSelect = (file: File | null) => {
    if (!file) {
      setSelectedArchive(null);
      return;
    }

    if (!file.name.endsWith(".zip")) {
      setStatus("error");
      setStatusMessage("Only .zip archives are supported.");
      return;
    }

    setStatus("idle");
    setStatusMessage("");
    setSelectedArchive(file);
  };

  const resetForm = () => {
    setFormState(defaultFormState);
    setStatus("idle");
    setStatusMessage("");
    setLogs([]);
    setSelectedArchive(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLogs([]);

    if (!selectedArchive) {
      setStatus("error");
      setStatusMessage("Upload a project archive before building.");
      return;
    }

    setStatus("working");
    setStatusMessage("Uploading and building executable with cx_Freeze...");

    const payload = new FormData();
    payload.append("bundle", selectedArchive);

    Object.entries(formState).forEach(([key, value]) => {
      if (value) {
        payload.append(key, value);
      }
    });

    try {
      const response = await fetch("/api/build", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        setStatus("error");
        try {
          const { message, details } = await response.json();
          setStatusMessage(message ?? "Build failed.");
          if (details && Array.isArray(details)) {
            setLogs(details);
          }
        } catch (err) {
          setStatusMessage("Build failed.");
        }
        return;
      }

      const buildName =
        formState.targetName ||
        formState.appName.replace(/\s+/g, "-").toLowerCase() ||
        "build";

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${buildName}.zip`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setStatus("success");
      setStatusMessage("Build succeeded! Your executable archive has downloaded.");
    } catch (error) {
      setStatus("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Unexpected error while building."
      );
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="pill w-max">
          <span role="img" aria-hidden>
            ⚡
          </span>
          Drag-and-drop cx_Freeze builder
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-50">
          Build Windows executables from Python projects in minutes
        </h1>
        <p className="muted max-w-3xl">
          Drop a zipped Python project, tune cx_Freeze options, and download a ready-made
          executable bundle. Works best when run locally where Python 3.11+ and
          cx_Freeze are available.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <section className="section-card">
          <h2>
            <span role="img" aria-hidden>
              📦
            </span>
            Project Bundle
          </h2>
          <p className="muted">
            Compress your Python project (including dependencies, entry script, and assets)
            into a single .zip archive before uploading.
          </p>

          <div
            className="mt-4 flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-500/70 bg-slate-900/40 transition hover:border-sky-400/80 hover:bg-slate-900/55"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const [file] = Array.from(event.dataTransfer.files);
              handleArchiveSelect(file ?? null);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(event) => {
                const [file] = Array.from(event.target.files ?? []);
                handleArchiveSelect(file ?? null);
              }}
            />
            <span className="text-lg font-semibold text-slate-200">{dropLabel}</span>
            <span className="muted mt-1 text-sm">
              Archive should include your virtual environment dependencies in requirements.txt
            </span>
          </div>

          {selectedArchive && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-100">{selectedArchive.name}</p>
                <p className="muted text-xs">
                  {(selectedArchive.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                className="button button-primary"
                onClick={resetForm}
                disabled={isBusy}
              >
                Clear
              </button>
            </div>
          )}
        </section>

        <section className="section-card">
          <h2>
            <span role="img" aria-hidden>
              🛠️
            </span>
            Build Options
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="appName" className="label">
                Application name
              </label>
              <input
                id="appName"
                className="input"
                value={formState.appName}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, appName: event.target.value }))
                }
                placeholder="MyApplication"
                disabled={isBusy}
              />
            </div>
            <div>
              <label htmlFor="version" className="label">
                Version
              </label>
              <input
                id="version"
                className="input"
                value={formState.version}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, version: event.target.value }))
                }
                placeholder="1.0.0"
                disabled={isBusy}
              />
            </div>
            <div>
              <label htmlFor="entryPoint" className="label">
                Entry script path
              </label>
              <input
                id="entryPoint"
                className="input"
                value={formState.entryPoint}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, entryPoint: event.target.value }))
                }
                placeholder="src/main.py"
                disabled={isBusy}
              />
            </div>
            <div>
              <label htmlFor="targetName" className="label">
                Executable name (optional)
              </label>
              <input
                id="targetName"
                className="input"
                value={formState.targetName}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, targetName: event.target.value }))
                }
                placeholder="myapp.exe"
                disabled={isBusy}
              />
            </div>
            <div>
              <label htmlFor="base" className="label">
                Base (Console / GUI)
              </label>
              <select
                id="base"
                className="input"
                value={formState.base}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, base: event.target.value }))
                }
                disabled={isBusy}
              >
                <option value="console">Console</option>
                <option value="gui">GUI (Win32)</option>
              </select>
            </div>
            <div>
              <label htmlFor="iconPath" className="label">
                Icon path inside archive (optional)
              </label>
              <input
                id="iconPath"
                className="input"
                value={formState.iconPath}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, iconPath: event.target.value }))
                }
                placeholder="assets/app.ico"
                disabled={isBusy}
              />
            </div>
            <div>
              <label htmlFor="includes" className="label">
                Include packages (comma separated)
              </label>
              <input
                id="includes"
                className="input"
                value={formState.includes}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, includes: event.target.value }))
                }
                placeholder="numpy,requests"
                disabled={isBusy}
              />
            </div>
            <div>
              <label htmlFor="excludes" className="label">
                Exclude packages (comma separated)
              </label>
              <input
                id="excludes"
                className="input"
                value={formState.excludes}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, excludes: event.target.value }))
                }
                placeholder="tkinter"
                disabled={isBusy}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="includeFiles" className="label">
                Extra files to include (comma separated)
              </label>
              <input
                id="includeFiles"
                className="input"
                value={formState.includeFiles}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    includeFiles: event.target.value,
                  }))
                }
                placeholder="config.json,assets/"
                disabled={isBusy}
              />
            </div>
          </div>
        </section>

        <section className="section-card">
          <h2>
            <span role="img" aria-hidden>
              🚀
            </span>
            Build Executable
          </h2>

          <div className="flex flex-col gap-4">
            <p className="muted">
              When you click build we will generate a temporary cx_Freeze setup script, run
              it, and return your executable output as a .zip. Keep this tab open until the
              download starts.
            </p>

            {status !== "idle" && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  status === "success"
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                    : status === "error"
                    ? "border-rose-500/60 bg-rose-500/10 text-rose-200"
                    : "border-sky-500/60 bg-sky-500/10 text-sky-100"
                }`}
              >
                {statusMessage}
              </div>
            )}

            {!!logs.length && (
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/40">
                <div className="border-b border-slate-700/60 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Build log
                </div>
                <pre className="max-h-64 overflow-auto px-4 py-3 text-xs text-slate-200">
                  {logs.join("\n")}
                </pre>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button className="button button-primary" type="submit" disabled={isBusy}>
                {isBusy ? "Building..." : "Build executable"}
              </button>
              <button
                className="button"
                type="button"
                onClick={resetForm}
                disabled={isBusy}
                style={{
                  background: "rgba(148, 163, 184, 0.2)",
                  color: "rgba(226, 232, 240, 0.9)",
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
