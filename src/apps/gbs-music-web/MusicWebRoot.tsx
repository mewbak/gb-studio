import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import AppContainerDnD from "components/app/AppContainerDnD";
import { installWebRendererApi } from "gbs-music-web/lib/api";
import { createMusicEditorStore } from "gbs-music-web/store/configureStore";
import ThemeProvider from "ui/theme/ThemeProvider";
import GlobalStyle from "ui/globalStyle";
import initRendererL10N from "renderer/lib/lang/initRendererL10N";
import { initKeyBindings } from "renderer/lib/keybindings/keyBindings";
import { MusicWebApp } from "gbs-music-web/components/MusicWebApp";
import { initTheme } from "renderer/lib/theme";
import { initMusicPlaybackListener } from "renderer/lib/music/initMusicPlaybackListener";

const store = createMusicEditorStore();
installWebRendererApi(store);
initMusicPlaybackListener(store.dispatch);
initKeyBindings();

(async () => {
  await initRendererL10N();
  await initTheme();

  const root = createRoot(document.getElementById("App") as HTMLElement);
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <ThemeProvider>
          <GlobalStyle />
          <AppContainerDnD>
            <MusicWebApp />
          </AppContainerDnD>
        </ThemeProvider>
      </Provider>
    </React.StrictMode>,
  );
})();
