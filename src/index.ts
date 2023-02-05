import { Inkdrop, InkdropDisposable } from "./types";

declare const inkdrop: Inkdrop;

type DefaultNotebooks = {
  [key: string]: string,
};

const pluginName = "workspace-default-notebook";
const eventPrefix = `${pluginName}`;
const configPrefix = `${pluginName}`;

const retrieveWorkspaceState = () => {
  const { sidebar: { workspace }, queryContext, bookList } = inkdrop.store.getState();
  const selectedBookId = (queryContext.mode === "book") && queryContext.bookId || undefined;
  const workspaceBookId = workspace.visible ? workspace.bookId : undefined;
  const workspaceRootSelected = workspaceBookId !== undefined && workspaceBookId === selectedBookId;
  const menuTargetBookId = bookList.bookForContextMenu?._id;
  return { selectedBookId, workspaceBookId, workspaceRootSelected, menuTargetBookId };
}

const setDefaultNotebook = (workspace: string, target: string) => {
  const current: DefaultNotebooks =
    JSON.parse(inkdrop.config.get(`${configPrefix}.defaults`) as string);
  current[workspace] = target;
  inkdrop.config.set(`${configPrefix}.defaults`, JSON.stringify(current));
};

const fetchDefaultNotebook = (workspace: string): string | undefined => {
  const defaults: DefaultNotebooks =
    JSON.parse(inkdrop.config.get(`${configPrefix}.defaults`) as string);
  return defaults[workspace];
};

const createNote = async (bookId: string | undefined) => {
  if(bookId === undefined) {
    inkdrop.commands.dispatch(document.body, "core:new-note");
    return;
  }
  const db = inkdrop.main.dataStore.getLocalDB();
  const note = {
    _id: db.notes.createId(),
    _rev: undefined,
    body: "",
    title: "",
    doctype: "markdown",
    createdAt: +new Date(),
    updatedAt: +new Date(),
    pinned: false,
    bookId,
  };
  try {
    await db.notes.put(note);
    const noteId = note._id;
    inkdrop.commands.dispatch(document.body, "core:open-note", { noteId });
    inkdrop.commands.dispatch(document.body, "editor:focus-mde");
  } catch (e) {
    console.error(`[${pluginName}] error while creating note: `, e);
    inkdrop.notifications.addError(
      "Failed to create new note",
      {dismissable: true, detail: `error: ${e}`},
    );
  }
}

const newNote = () => {
  const { workspaceBookId, workspaceRootSelected } = retrieveWorkspaceState();
  const target = workspaceRootSelected && workspaceBookId ?
    fetchDefaultNotebook(workspaceBookId) : undefined;
  console.debug(`[${pluginName}] creating new note`);
  createNote(target);
};

const setDefault = () => {
  const { menuTargetBookId, workspaceBookId } = retrieveWorkspaceState();
  if(workspaceBookId !== undefined && menuTargetBookId !== undefined) {
    console.debug(`[${pluginName}] marking ${menuTargetBookId} as default notebook of ${workspaceBookId}`)
    setDefaultNotebook(workspaceBookId, menuTargetBookId);
    setDefaultTip();
    const { books } = inkdrop.store.getState();
    const targetBookName = books.hash[menuTargetBookId]?.name || "";
    const workspaceBookName = books.hash[workspaceBookId]?.name || "";
    inkdrop.notifications.addInfo(
      "Workspace default notebook updated",
      {
        dismissable: true,
        detail: `Default notebook for "${workspaceBookName}" is set to "${targetBookName}"`,
      },
    );
  }
};

let defaultTipHandler: InkdropDisposable | undefined = undefined;
let defaultTipWorkspace: string | undefined = undefined;
const allNotesSelector = ".sidebar-workspace-menu .sidebar-menu-item-all-notes";

const setDefaultTip = () => {
  if(defaultTipHandler !== undefined) {
    defaultTipHandler.dispose();
    defaultTipHandler = undefined;
  }
  const { workspaceBookId } = retrieveWorkspaceState();
  const { books } = inkdrop.store.getState();
  const bookId = workspaceBookId ? fetchDefaultNotebook(workspaceBookId) : undefined;
  const bookName = (bookId && books.hash[bookId]?.name) || "(none)";
  const label = `Default: ${bookName}`;
  const command = `${eventPrefix}:void`;
  defaultTipHandler = inkdrop.contextMenu.add({[allNotesSelector]: [{label, command}]});
  defaultTipWorkspace = workspaceBookId;
};

export const activate = () => {
  inkdrop.commands.add(document.body, `${eventPrefix}:new-note`, newNote);
  inkdrop.commands.add(document.body, `${eventPrefix}:set-default`, setDefault);
  inkdrop.store.subscribe(() => {
    const { sidebar: { workspace } } = inkdrop.store.getState();
    if(workspace.visible && workspace.bookId !== defaultTipWorkspace) {
      setDefaultTip();
    }

  });
  setDefaultTip();
};

export const config = {
  defaults: {
    title: "default notebooks",
    type: "string",
    default: "{}",
  },
};
