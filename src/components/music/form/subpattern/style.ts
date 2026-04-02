import styled from "styled-components";

// #region InstrumentSubpatternScript

export const StyledInstrumentSubpatternScriptList = styled.div`
  position: relative;
  z-index: 0;
`;

export const StyledInstrumentSubpatternJumpOverlay = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  z-index: 2;
  stroke: ${(props) => props.theme.colors.scripting.header.text};
`;

// #endregion InstrumentSubpatternScript
