import { Book, Note } from "inkdrop-model";

export type InkdropState = {
  books: {
    hash: { [bookId: string]: Book },
  },
  queryContext: { mode: "all" | "tag" | "status" | "trash" | "search" } | {
    mode: "book",
    bookId: string,
  },
  bookList: {
    bookForContextMenu: Book | null,
  },
  sidebar: {
    workspace: {
      visible: boolean,
      bookId: string,
    },
  },
};

export type InkdropDBNote = {
  createId: () => string,
  put: (doc: Note) => Promise<unknown>,
};

export type InkdropNotifier =
  (message: string, options?: { dismissable?: boolean, detail?: string }) => void;

export type InkdropDisposable = {
  dispose: () => void,
};

export type Inkdrop = {
  store: {
    getState: () => InkdropState,
    subscribe: (listener: () => void) => void,
  },
  config: {
    get: (key: string) => string | number | boolean | undefined,
    set: (key: string, value: string | number | boolean | undefined) => void,
  },
  commands: {
    add: (target: Node, commandName: string, callback: (event: Event) => void) => void,
    dispatch: (target: Node, commandName: string, detail?: Record<string, unknown>) => void,
  },
  main: {
    dataStore: {
      getLocalDB: () => {
        notes: InkdropDBNote,
      },
    },
  },
  notifications: {
    addInfo: InkdropNotifier,
    addError: InkdropNotifier,
  },
  contextMenu: {
    add: (itemsBySelector: {
      [selector: string]: {
        label: string,
        command?: string,
      }[]
    }) => InkdropDisposable,
  },
};
