import React from "react";

interface FlatListOuterDropContextValue<T> {
  acceptTypes: string[];
  onItemDrop: (item: T) => void;
}

const FlatListOuterDropContext =
  React.createContext<FlatListOuterDropContextValue<unknown> | null>(null);

export const useFlatListOuterDropContext = <T,>() => {
  const value = React.useContext(FlatListOuterDropContext);

  if (!value) {
    throw new Error("FlatListOuterDropTarget used outside provider");
  }

  return value as FlatListOuterDropContextValue<T>;
};

export const FlatListOuterDropProvider = FlatListOuterDropContext.Provider;
