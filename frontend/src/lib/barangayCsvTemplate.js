const TEMPLATE_ROWS = [
  ["Full Name", "Gender", "Age", "Barangay Address", "Municipality", "Status", "Phone Number"],
  ["Juan Dela Cruz", "Male", "34", "Barangay Washington", "Surigao City", "Active", "0917-123-4567"],
  ["Maria Santos", "Female", "41", "Poblacion", "Dapa, Siargao", "Active", "0918-222-3344"],
  ["Erric Traya", "Male", "23", "General Luna", "Surigao del Norte", "Active", "0912-345-6789"],
  ["Elena Gonzaga", "Female", "29", "Barangay Luna", "Surigao City", "Active", "0919-456-7890"],
  ["Pedro Penduko", "Male", "55", "Union", "General Luna, Siargao", "Active", "0920-333-4455"],
];

export function downloadBarangayCsvTemplate() {
  const csv = TEMPLATE_ROWS.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "barangay-masterlist-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
