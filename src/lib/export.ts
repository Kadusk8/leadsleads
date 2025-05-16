export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    console.warn("No data to export.");
    return;
  }

  try {
    const replacer = (_key: string, value: any) => (value === null || value === undefined ? "" : value);
    const header = Object.keys(rows[0]);
    const csv = [
      header.join(','), 
      ...rows.map((row) =>
        header
          .map((fieldName) => {
            let fieldValue = row[fieldName];
            if (typeof fieldValue === 'string') {
              // Escape double quotes by doubling them, and wrap in double quotes if it contains comma, newline or double quote
              if (fieldValue.includes('"') || fieldValue.includes(',') || fieldValue.includes('\n')) {
                fieldValue = `"${fieldValue.replace(/"/g, '""')}"`;
              }
            } else if (typeof fieldValue === 'object' && fieldValue !== null) {
              fieldValue = `"${JSON.stringify(fieldValue).replace(/"/g, '""')}"`; // Stringify objects and escape quotes
            } else {
              fieldValue = JSON.stringify(fieldValue, replacer);
              // Remove surrounding quotes from JSON.stringify for simple types if they don't need escaping
              if (typeof row[fieldName] !== 'string' && typeof row[fieldName] !== 'object' && fieldValue.startsWith('"') && fieldValue.endsWith('"')) {
                 fieldValue = fieldValue.substring(1, fieldValue.length -1);
              }
            }
            return fieldValue;
          })
          .join(',')
      ),
    ].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error("Error exporting to CSV:", error);
    alert("Failed to export data to CSV. Check console for details.");
  }
}
