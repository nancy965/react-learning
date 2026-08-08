
import { useState } from "react";

function App() {
  const[formData, setFormData] = useState({
    name: "",
    email: "",
    age: ""
  });

  const[submittedData, setSubmittedData] = useState(null);
  const handleChange = (event) => {
    const{ name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmittedData(formData);
  };

  return (
    <div>
      <h2>React Form</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleChange}/>

        <br /><br />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}/>

        <br /><br />

        <input
          type="number"
          name="age"
          placeholder="Age"
          value={formData.age}
          onChange={handleChange}/>

        <br /><br />  

        <button type="submit">Submit</button>
      </form>

      {submittedData && (
        <div>
          <h3>Entered Data</h3>
          <p>Name: {submittedData.name}</p>
          <p>Email: {submittedData.email}</p>
          <p>Age: {submittedData.age}</p>
        </div>
      )}
    </div>
  );
}
export default App;
