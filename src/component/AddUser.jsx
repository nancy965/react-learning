import { useState } from "react";
import { addUser } from "../services/userService";

function AddUser({ refreshUsers }) {

    const [user, setUser] = useState({
        name:"",
        email:"",
        age:""
    });

    const [error, setError] = useState("");
    const handleSubmit = (e) => {

        e.preventDefault();

        if(!/^[A-Za-z ]+$/.test(user.name)){
            setError("Name should contain only letters");
            return;
        }


        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)){
            setError("Enter valid email");
            return;
        }


        if(user.age < 1 || user.age > 100){
            setError("Age must be between 1 and 100");
            return;
        }
        setError("");

        addUser(user)
        .then(() => {
            refreshUsers();

            setUser({
                name:"",
                email:"",
                age:""
            });
        });
    };
    return (
        <div>

            <h3>Add User</h3>
            {error && <p style={{color:"red"}}>{error}</p>}
            <input
                placeholder="Name"
                value={user.name}
                onChange={(e)=>setUser({...user,name:e.target.value})}/>

            <input
                placeholder="Email"
                value={user.email}
                onChange={(e)=>setUser({...user,email:e.target.value})}/>

            <input
                placeholder="Age"
                value={user.age}
                onChange={(e)=>setUser({...user,age:e.target.value})}
            />

            <button onClick={handleSubmit}>
                Save
            </button>

        </div>
    );
}


export default AddUser;