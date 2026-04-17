import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog
from zerok.core import init_client

class ZerokApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Zerok Vault")
        self.client = None

        self.status = tk.StringVar(value="Vault not initialized")

        tk.Label(root, text="Zerok Vault", font=("Arial", 16)).pack(pady=10)

        tk.Button(root, text="Initialize Vault", command=self.init_vault).pack(pady=5)
        tk.Button(root, text="Add File", command=self.add_file).pack(pady=5)

        tk.Label(root, textvariable=self.status).pack(pady=10)

    def init_vault(self):
        password = simpledialog.askstring(
            "Vault Password",
            "Set a vault password:",
            show="*"
        )
        if not password:
            return

        self.client = init_client("http://localhost:5000", password)
        self.status.set("Encrypted locally ✅  Zero-knowledge ✅")

    def add_file(self):
        if not self.client:
            messagebox.showerror("Error", "Initialize the vault first.")
            return

        path = filedialog.askopenfilename()
        if not path:
            return

        with open(path, "rb") as f:
            blob_id = self.client.upload(f.read())

        messagebox.showinfo(
            "Stored Securely",
            f"File encrypted locally and stored.\n\nBlob ID:\n{blob_id}"
        )

if __name__ == "__main__":
    root = tk.Tk()
    ZerokApp(root)
    root.mainloop()