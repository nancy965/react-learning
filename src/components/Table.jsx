import "./Table.css";

function Table({
  columns,
  data,
  renderRow,
  emptyMessage = "No data found",
  minWidth = "100%",
}) {
  const gridTemplate = columns
    .map((column) => {
      const w = column.width || "1fr";
      return w.endsWith("fr") ? `minmax(0, ${w})` : w;
    })
    .join(" ");

  return (
    <div className="table-wrapper">
      <div className="reusable-table" style={minWidth ? { minWidth } : undefined}>

        {/* ================= HEADER ================= */}
        <div
          className="table-header"
          style={{
            gridTemplateColumns: gridTemplate,
          }}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className={`table-header-cell ${
                column.align || "left"
              }`}
            >
              {column.label}
            </div>
          ))}
        </div>

        {/* ================= BODY ================= */}
        <div className="table-body">
          {data.length > 0 ? (
            data.map((item, index) => (
              <div
                className="table-row-wrapper"
                key={item.id}
              >
                {renderRow(item, index, gridTemplate)}
              </div>
            ))
          ) : (
            <div className="table-empty-row">
              <div className="table-empty-cell">
                {emptyMessage}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Table;