import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { updateUser, deleteUser } from "../services/userService";

function UserCard({ user, refreshUsers }) {

    const [showConfirm, setShowConfirm] = useState(false);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email,
        age: user.age
    });

    const [error, setError] = useState("");
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

//update user
    const handleUpdate = async () => {
        setError("");

//name validation
        if (!formData.name) {
            setError("Name is required");
            return;
        }

        if (!/^[A-Za-z ]+$/.test(formData.name)) {
            setError("Name should contain only letters");
            return;
        }

//email validation
        if (!formData.email) {
            setError("Email is required");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError("Enter valid email");
            return;
        }

//age validation
        if (!formData.age) {
            setError("Age is required");
            return;
        }
        if (formData.age < 1 || formData.age > 100) {
            setError("Age must be between 1 and 100");
            return;
        }
        try {
            await updateUser(user.id, formData);
            setEditing(false);
            refreshUsers();
        } catch (error) {
            console.log(error);
            if (error.response) {
                setError(error.response.data.message);
            } else {
                setError("Something went wrong");
            }
        }
    };

//delete user
    const handleDelete = async () => {
        try {
            await deleteUser(user.id);
            setShowConfirm(false);
            refreshUsers();
        } catch (error) {
            console.log(error);
            setShowConfirm(false);
            if (error.response) {
                setError(error.response.data.message);
            } else {
                setError("Something went wrong");
            }
        }
    };

//edit mode
    if (editing) {
        return (
            <div className="edit-user">
                {error && (
                    <p style={{ color: "red" }}>
                        {error}
                    </p>
                )}
                <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}/>

                <input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}/>

                <input
                    name="age"
                    type="number"
                    value={formData.age}
                    onChange={handleChange}/>

                <button onClick={handleUpdate}>Update</button>
                <button onClick={() => setEditing(false)}>Cancel</button>
            </div>
        );
    }

//normal mode
    return (
        <div className="user-row">
            <div>{user.name}</div>
            <div>{user.email}</div>
            <div>{user.age}</div>
            <div className="actions">
                <button onClick={() => setEditing(true)}>Edit</button>
                <button onClick={() => setShowConfirm(true)}>Delete</button>
            </div>
            {error && (
                <p style={{ color: "red" }}>
                    {error}
                </p>
            )}
            {showConfirm && (
                <ConfirmDialog
                    message="Are you sure you want to delete this user?"
                    onConfirm={handleDelete}
                    onCancel={() => setShowConfirm(false)}/>
            )}
        </div>
    );
}
export default UserCard;

