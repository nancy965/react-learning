import { useState } from "react";
import { addUser } from "../services/userService";

function AddUser({ refreshUsers }) {

    const [user, setUser] = useState({
        name: "",
        email: "",
        age: ""
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");

        // Name validation
        if (!user.name) {
            setError("Name is required");
            return;
        }

        if (!/^[A-Za-z ]+$/.test(user.name)) {
            setError("Name should contain only letters");
            return;
        }

        // Email validation
        if (!user.email) {
            setError("Email is required");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
            setError("Enter valid email");
            return;
        }

        // Age validation
        if (!user.age) {
            setError("Age is required");
            return;
        }

        if (user.age < 1 || user.age > 100) {
            setError("Age must be between 1 and 100");
            return;
        }

        try {

            await addUser(user);

            setSuccess("User added successfully!");

            setUser({
                name: "",
                email: "",
                age: ""
            });

            // Refresh users list
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
    return (
        <div>
            <h3>Add User</h3>
            
            {error && (
                <p style={{ color: "red" }}>
                    {error}
                </p>
            )}
            {success && (
                <p style={{ color: "green" }}>
                    {success}
                </p>
            )}

            <input
                placeholder="Name"
                value={user.name}
                onChange={(e) =>
                    setUser({
                        ...user,
                        name: e.target.value
                    })
                }/>
            

            <input
                placeholder="Email"
                value={user.email}
                onChange={(e) =>
                    setUser({
                        ...user,
                        email: e.target.value
                    })
                }/>

            <input
                placeholder="Age"
                type="number"
                value={user.age}
                onChange={(e) =>
                    setUser({
                        ...user,
                        age: e.target.value
                    })
                }/>

            <button onClick={handleSubmit}>Save</button>
        </div>
    );
}
export default AddUser;

