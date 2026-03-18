import type {
  MusicDocumentReference,
  MusicWorkspace,
} from "shared/lib/music/workspace";
import { createMusicWorkspace } from "shared/lib/music/workspace";
import type {
  MusicEnvironment,
  MusicWorkspaceDocument,
} from "shared/lib/music/environment";

type MusicBinaryDocument = Uint8Array;

declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      multiple?: boolean;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle[]>;
    showDirectoryPicker?: () => Promise<
      FileSystemDirectoryHandle & {
        values(): AsyncIterable<FileSystemHandle>;
      }
    >;
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle>;
  }
}

const musicExtensions = [".uge", ".mod"];
const newSongBaseName = "New Song";
const accept = {
  description: "GB Studio music files",
  accept: {
    "application/octet-stream": [".uge", ".mod"],
  },
};

const fileHandles = new Map<string, FileSystemFileHandle>();
const inMemoryDocuments = new Map<
  string,
  MusicWorkspaceDocument<MusicBinaryDocument>
>();
let currentDirectoryHandle:
  | (FileSystemDirectoryHandle & {
      values(): AsyncIterable<FileSystemHandle>;
    })
  | undefined;
let fallbackDocumentId = 0;

const isFileHandle = (
  handle: FileSystemHandle,
): handle is FileSystemFileHandle => handle.kind === "file";

const supportsFileOpenPicker = () =>
  typeof window !== "undefined" && "showOpenFilePicker" in window;

const supportsDirectoryPicker = () =>
  typeof window !== "undefined" && "showDirectoryPicker" in window;

const supportsSavePicker = () =>
  typeof window !== "undefined" && "showSaveFilePicker" in window;

const supportsFileSystemAccess = () =>
  supportsFileOpenPicker() && supportsDirectoryPicker() && supportsSavePicker();

const sortByName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const getOpenFilePicker = () => {
  const picker = window.showOpenFilePicker;
  if (!picker) {
    throw new Error("Open file picker is not available.");
  }
  return picker;
};

const getDirectoryPicker = () => {
  const picker = window.showDirectoryPicker;
  if (!picker) {
    throw new Error("Directory picker is not available.");
  }
  return picker;
};

const getSaveFilePicker = () => {
  const picker = window.showSaveFilePicker;
  if (!picker) {
    throw new Error("Save file picker is not available.");
  }
  return picker;
};

const createWorkspaceFilename = (
  name: string,
  workspace?: Pick<MusicWorkspace, "openMode" | "rootName">,
) =>
  workspace?.openMode === "directory" && workspace.rootName
    ? `${workspace.rootName}/${name}`
    : name;

const createReference = (
  name: string,
  filename: string,
  options?: { readonly?: boolean; id?: string },
): MusicDocumentReference => ({
  id: options?.id ?? filename,
  name,
  filename,
  format: filename.toLowerCase().endsWith(".mod") ? "mod" : "uge",
  readonly: options?.readonly,
});

const writeFileHandle = async (
  handle: FileSystemFileHandle,
  data: Uint8Array,
) => {
  const writable = await handle.createWritable();
  await writable.write(Uint8Array.from(data));
  await writable.close();
};

const cloneBytes = (data: Uint8Array) => Uint8Array.from(data);

const storeInMemoryDocument = (
  meta: MusicDocumentReference,
  data: Uint8Array,
  modified = false,
) => {
  const storedDocument = {
    meta,
    data: cloneBytes(data),
    modified,
  };
  inMemoryDocuments.set(meta.filename, storedDocument);
  return storedDocument;
};

const downloadBytes = (filename: string, data: Uint8Array) => {
  const blob = new Blob([Uint8Array.from(data)], {
    type: "application/octet-stream",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const openFilesWithInput = async (options?: {
  multiple?: boolean;
  directory?: boolean;
}) =>
  new Promise<File[]>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = musicExtensions.join(",");
    input.multiple = options?.multiple ?? false;
    if (options?.directory) {
      input.setAttribute("webkitdirectory", "");
    }
    input.onchange = () => {
      resolve(Array.from(input.files ?? []));
    };
    input.oncancel = () => {
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };
    input.click();
  });

const toReferenceFilename = (
  file: File,
  workspace?: Pick<MusicWorkspace, "openMode" | "rootName">,
) => {
  const relativePath =
    typeof file.webkitRelativePath === "string" &&
    file.webkitRelativePath.length > 0
      ? file.webkitRelativePath
      : file.name;
  if (workspace?.openMode === "directory" && workspace.rootName) {
    return `${workspace.rootName}/${relativePath.split("/").pop() || file.name}`;
  }
  return relativePath;
};

const registerHandleReference = (
  handle: FileSystemFileHandle,
  workspace?: Pick<MusicWorkspace, "openMode" | "rootName">,
) => {
  const reference = createReference(
    handle.name,
    createWorkspaceFilename(handle.name, workspace),
  );
  fileHandles.set(reference.filename, handle);
  return reference;
};

const registerFallbackFileReference = async (
  file: File,
  workspace?: Pick<MusicWorkspace, "openMode" | "rootName">,
) => {
  const filename = toReferenceFilename(file, workspace);
  const id = `fallback-${fallbackDocumentId++}-${filename}`;
  const reference = createReference(file.name, filename, { id });
  storeInMemoryDocument(reference, new Uint8Array(await file.arrayBuffer()));
  return reference;
};

const createFallbackWorkspaceRoot = (files: File[]) => {
  const firstPath = files[0]?.webkitRelativePath;
  if (!firstPath) {
    return "Imported Songs";
  }
  return firstPath.split("/")[0] || "Imported Songs";
};

const findAvailableSongName = async (
  directoryHandle: FileSystemDirectoryHandle,
) => {
  let index = 0;
  while (true) {
    const candidate =
      index === 0
        ? `${newSongBaseName}.uge`
        : `${newSongBaseName} ${index + 1}.uge`;
    try {
      await directoryHandle.getFileHandle(candidate);
      index += 1;
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") {
        return candidate;
      }
      throw error;
    }
  }
};

const createFallbackNewSongReference = (
  workspace?: Pick<MusicWorkspace, "openMode" | "rootName">,
) => {
  const suffix = fallbackDocumentId++ || 0;
  const fileName =
    suffix === 0
      ? `${newSongBaseName}.uge`
      : `${newSongBaseName} ${suffix + 1}.uge`;
  const reference = createReference(
    fileName.replace(/\.uge$/, ""),
    createWorkspaceFilename(fileName, workspace),
    { id: `fallback-new-${suffix}-${fileName}` },
  );
  return reference;
};

export const webMusicEnvironment: MusicEnvironment<MusicBinaryDocument> = {
  confirmDiscardChanges: async () => "discard",
  setWindowTitle: (title) => {
    document.title = title;
  },
  openFileWorkspace: async () => {
    if (supportsFileOpenPicker()) {
      const [handle] = await getOpenFilePicker()({
        multiple: false,
        types: [accept],
      });
      currentDirectoryHandle = undefined;
      const reference = registerHandleReference(handle);
      return createMusicWorkspace({
        source: "browser",
        openMode: "file",
        activeDocumentId: reference.id,
        documents: [reference],
      });
    }

    const [file] = await openFilesWithInput({ multiple: false });
    if (!file) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    currentDirectoryHandle = undefined;
    const reference = await registerFallbackFileReference(file);
    return createMusicWorkspace({
      source: "browser",
      openMode: "file",
      activeDocumentId: reference.id,
      documents: [reference],
    });
  },
  openDirectoryWorkspace: async () => {
    if (supportsDirectoryPicker()) {
      const directoryHandle = await getDirectoryPicker()();
      currentDirectoryHandle = directoryHandle;
      const documents: MusicDocumentReference[] = [];
      for await (const entry of directoryHandle.values()) {
        if (
          isFileHandle(entry) &&
          musicExtensions.some((extension) =>
            entry.name.toLowerCase().endsWith(extension),
          )
        ) {
          const filename = `${directoryHandle.name}/${entry.name}`;
          const reference = createReference(entry.name, filename);
          documents.push(reference);
          fileHandles.set(reference.filename, entry);
        }
      }
      const sortedDocuments = sortByName(documents);
      return createMusicWorkspace({
        source: "browser",
        openMode: "directory",
        rootName: directoryHandle.name,
        activeDocumentId: sortedDocuments[0]?.id,
        documents: sortedDocuments,
      });
    }

    const files = await openFilesWithInput({ multiple: true, directory: true });
    const musicFiles = files.filter((file) =>
      musicExtensions.some((extension) =>
        file.name.toLowerCase().endsWith(extension),
      ),
    );
    const rootName = createFallbackWorkspaceRoot(musicFiles);
    currentDirectoryHandle = undefined;
    const documents = await Promise.all(
      musicFiles.map((file) =>
        registerFallbackFileReference(file, {
          openMode: "directory",
          rootName,
        }),
      ),
    );
    const sortedDocuments = sortByName(documents);
    return createMusicWorkspace({
      source: "browser",
      openMode: "directory",
      rootName,
      activeDocumentId: sortedDocuments[0]?.id,
      documents: sortedDocuments,
    });
  },
  loadDocument: async (document) => {
    const handle = fileHandles.get(document.filename);
    if (handle) {
      const file = await handle.getFile();
      return {
        meta: document,
        data: new Uint8Array(await file.arrayBuffer()),
        modified: false,
      };
    }

    const fallbackDocument = inMemoryDocuments.get(document.filename);
    if (!fallbackDocument) {
      throw new Error(
        `Document data for ${document.filename} is not available.`,
      );
    }

    return {
      ...fallbackDocument,
      meta: document,
      data: cloneBytes(fallbackDocument.data),
    };
  },
  saveDocument: async (document) => {
    const handle = fileHandles.get(document.meta.filename);
    if (handle) {
      await writeFileHandle(handle, document.data);
      storeInMemoryDocument(document.meta, document.data, false);
      return;
    }

    storeInMemoryDocument(document.meta, document.data, false);
    downloadBytes(
      document.meta.filename.split("/").pop() || document.meta.name,
      document.data,
    );
  },
  saveDocumentAs: async (document) => {
    if (supportsSavePicker()) {
      const handle = await getSaveFilePicker()({
        suggestedName:
          document.meta.filename.split("/").pop() || document.meta.name,
        types: [accept],
      });
      await writeFileHandle(handle, document.data);
      const file = await handle.getFile();
      const meta = createReference(file.name, file.name);
      fileHandles.set(meta.filename, handle);
      storeInMemoryDocument(meta, document.data, false);
      return {
        ...document,
        meta,
        modified: false,
      };
    }

    const filename =
      document.meta.filename.split("/").pop() || document.meta.name;
    const fallbackMeta = createReference(
      filename.replace(/\.[^.]+$/, ""),
      filename,
      { id: document.meta.id },
    );
    storeInMemoryDocument(fallbackMeta, document.data, false);
    downloadBytes(filename, document.data);
    return {
      ...document,
      meta: fallbackMeta,
      modified: false,
    };
  },
};

export const importMusicDocument = async (
  workspace?: Pick<MusicWorkspace, "openMode" | "rootName">,
): Promise<MusicDocumentReference | null> => {
  try {
    if (supportsFileOpenPicker()) {
      const [handle] = await getOpenFilePicker()({
        multiple: false,
        types: [accept],
      });
      return registerHandleReference(handle, workspace);
    }

    const [file] = await openFilesWithInput({ multiple: false });
    if (!file) {
      return null;
    }
    return registerFallbackFileReference(file, workspace);
  } catch (error) {
    if (isAbortError(error)) {
      return null;
    }
    throw error;
  }
};

export const createTemplateMusicDocument = async (
  data: Uint8Array,
  workspace?: Pick<MusicWorkspace, "openMode" | "rootName">,
): Promise<MusicDocumentReference | null> => {
  try {
    if (
      workspace?.openMode === "directory" &&
      currentDirectoryHandle &&
      supportsFileSystemAccess()
    ) {
      const filename = await findAvailableSongName(currentDirectoryHandle);
      const handle = await currentDirectoryHandle.getFileHandle(filename, {
        create: true,
      });
      await writeFileHandle(handle, data);
      const reference = registerHandleReference(handle, workspace);
      storeInMemoryDocument(reference, data, false);
      return reference;
    }

    if (supportsSavePicker()) {
      const handle = await getSaveFilePicker()({
        suggestedName: `${newSongBaseName}.uge`,
        types: [accept],
      });
      await writeFileHandle(handle, data);
      currentDirectoryHandle = undefined;
      const reference = registerHandleReference(handle);
      storeInMemoryDocument(reference, data, false);
      return reference;
    }

    const reference = createFallbackNewSongReference(workspace);
    storeInMemoryDocument(reference, data, false);
    currentDirectoryHandle = undefined;
    return reference;
  } catch (error) {
    if (isAbortError(error)) {
      return null;
    }
    throw error;
  }
};

export const supportsDirectoryOpen = () =>
  supportsDirectoryPicker() ||
  "webkitdirectory" in document.createElement("input");

export const supportsPersistentSave = () => supportsSavePicker();

export type { MusicBinaryDocument };
