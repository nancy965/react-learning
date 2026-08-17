import "./Table.css";

function Table({ columns, data, renderRow }) {
  return (
    <div className="table-wrapper">
      <div className="reusable-table">

        {/* HEADER */}
        <div className="table-header">
          {columns.map((column) => (
            <div key={column.key}>
              {column.label}
            </div>
          ))}
        </div>

        {/* BODY */}
        <div className="table-body">
          {data.map((item) => (
            <div key={item.id}>
              {renderRow(item)}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default Table;