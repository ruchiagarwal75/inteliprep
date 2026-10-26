const SESSIONS = "interviews";
const META = "meta";

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new Error(
          "Browser storage isn't available. Interviews won't survive a refresh.",
        ),
      );
      return;
    }
    const request = indexedDB.open(name, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      request.result.createObjectStore(SESSIONS, { keyPath: "id" });
      request.result.createObjectStore(META);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(
        new Error("Close other InteliPrep tabs to enable browser storage."),
      );
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

export function createInterviewDatabase(userId: string) {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      userId,
    )
  )
    throw new Error("A valid account is required for browser storage.");
  const name = `inteliprep:account:${userId}`;
  let active = true;
  const pending = new Set<IDBTransaction>();
  async function transaction<T>(
    mode: IDBTransactionMode,
    run: (
      tx: IDBTransaction,
      done: (value: T) => void,
      fail: (error: Error) => void,
    ) => void,
  ): Promise<T> {
    if (!active)
      throw new Error(
        "Your signed-in account changed. Please reopen the interview.",
      );
    const db = await openDatabase(name);
    if (!active) {
      db.close();
      throw new Error(
        "Your signed-in account changed. Please reopen the interview.",
      );
    }
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction([SESSIONS, META], mode);
      pending.add(tx);
      let result: T;
      let failure: Error | null = null;
      tx.oncomplete = () => {
        pending.delete(tx);
        db.close();
        resolve(result);
      };
      tx.onabort = tx.onerror = () => {
        pending.delete(tx);
        db.close();
        reject(
          failure ??
            tx.error ??
            new Error(
              "Browser save failed. Check your storage settings and free disk space.",
            ),
        );
      };
      try {
        run(
          tx,
          (value) => {
            result = value;
          },
          (error) => {
            failure = error;
            tx.abort();
          },
        );
      } catch (error) {
        failure =
          error instanceof Error ? error : new Error("Browser storage failed");
        tx.abort();
      }
    });
  }

  return {
    transaction,
    deactivate() {
      active = false;
      for (const tx of pending) {
        try {
          tx.abort();
        } catch {
          /* Already committed or aborted. */
        }
      }
    },
  };
}
