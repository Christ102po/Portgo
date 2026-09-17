export async function confirmDelete({ title, text, confirmButtonText = "Delete" }) {
  if (window.Swal) {
    const result = await window.Swal.fire({
      title, text, icon: "warning", showCancelButton: true,
      confirmButtonText, cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626", cancelButtonColor: "#64748b",
      reverseButtons: true, focusCancel: true,
    });
    return result.isConfirmed;
  }
  return window.confirm(`${title}\n\n${text}`);
}

export function sweetSuccess(title, text = "") {
  if (window.Swal) return window.Swal.fire({ title, text, icon: "success", confirmButtonColor: "#059669" });
}

export function sweetError(title, text = "") {
  if (window.Swal) return window.Swal.fire({ title, text, icon: "error", confirmButtonColor: "#059669" });
}
