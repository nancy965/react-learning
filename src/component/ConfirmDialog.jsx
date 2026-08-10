
function ConfirmDialog({ message, onConfirm, onCancel }) {
    return (
        <div className="confirm-box">
            <div className="confirm-content">
                <p>{message}</p>
                <button onClick={onConfirm}>Yes</button>
                <button onClick={onCancel}>No</button>
            </div>
        </div>
    );
}
export default ConfirmDialog;

