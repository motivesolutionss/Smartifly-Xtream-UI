import { useState } from "react";
import { Badge, DotSeparator } from "../../components/base/SharedUiComponents";
import { SmartiflyLoader } from "../../components/base/SmartiflyLoader";
import { useConnectionTest } from "./useConnectionTest";

export const AddPlaylistScreen = () => {
  const [playlistName, setPlaylistName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { state, errorMessage, result, testConnection } = useConnectionTest();

  const isTesting = state === "testing";

  return (
    <main className="onboarding-shell">
      <section className="onboarding-copy" aria-labelledby="add-playlist-title">
        <div className="brand-lockup">
          <div className="brand-mark">S</div>
          <div>
            <p className="brand-name">SMARTIFLY</p>
            <p className="brand-mode">Enterprise Edition</p>
          </div>
        </div>

        <div className="meta-row">
          <Badge text="TIZEN TV" />
          <DotSeparator />
          <span>Xtream compatible</span>
          <DotSeparator />
          <span>Live first</span>
        </div>

        <h1 id="add-playlist-title">Add Playlist</h1>
        <p className="lede">Validate your account and preload Live TV data.</p>
      </section>

      <section className="connection-panel glass-panel" aria-label="Connection test">
        <div className="panel-heading">
          <h2>Connection Test</h2>
          {isTesting && <SmartiflyLoader size={42} strokeWidth={3} label="Testing" />}
        </div>

        <form
          className="playlist-form"
          onSubmit={(event) => {
            event.preventDefault();
            void testConnection({ playlistName, serverUrl, username, password });
          }}
        >
          <label>
            Playlist name
            <input
              value={playlistName}
              onChange={(event) => setPlaylistName(event.target.value)}
              placeholder="Living Room TV"
              autoComplete="off"
            />
          </label>

          <label>
            Server URL
            <input
              value={serverUrl}
              onChange={(event) => setServerUrl(event.target.value)}
              placeholder="http://example.com:8080"
              autoComplete="url"
              required
            />
          </label>

          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button className="primary-action" type="submit" disabled={isTesting}>
            {isTesting ? "Testing connection..." : "Test and Save"}
          </button>
        </form>

        {errorMessage && <p className="status-message error">{errorMessage}</p>}

        {result && (
          <p className="status-message success">
            Connected. Detected {result.liveCategoryCount} live categories and confirmed
            live content availability
            {result.usedCatalogFallback
              ? " with a full catalog fallback."
              : " with a lightweight startup probe."}
          </p>
        )}
      </section>
    </main>
  );
};
