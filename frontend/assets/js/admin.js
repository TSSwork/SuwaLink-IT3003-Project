fetch("http://localhost:8080/api/admin/dashboard",{
    headers:{
        Authorization:"Bearer "+localStorage.getItem("token")
    }
})
    .then(response=>response.json())
    .then(data=>{

        document.getElementById("customers").innerText=data.totalCustomers;
        document.getElementById("pharmacies").innerText=data.totalPharmacies;
        document.getElementById("verified").innerText=data.verifiedPharmacies;
        document.getElementById("pending").innerText=data.pendingPharmacies;

    });