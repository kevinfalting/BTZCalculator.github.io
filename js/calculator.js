function fmt0(numb){
    return ('0'+numb).slice(-2)
}

MONTH=['January','February','March','April','May','June','July','August','September','October','November','December']

function formatDate(date,formatStr){
    return formatStr.replace("YYYY",date.getFullYear())
        .replace("MMMM",MONTH[date.getMonth()])
        .replace("MM",fmt0(date.getMonth()+1))
        .replace("DD",fmt0(date.getDate()))
        .replace("Do",date.getDate()+((lastDigit=String(date.getDate()).slice(-1))=="1"?"st":lastDigit=="2"?"nd":lastDigit=="3"?"rd":"th"))
}

function addMonths(date,months){
    var newDate=new Date(date)
    newDate.setMonth(newDate.getMonth()+months)
    newDate.setDate(date.getDate())
    return newDate
}

function parse(dateStr){
    var year=dateStr.substr(0,4)
    var month=dateStr.substr(5,2)
    var day=dateStr.substr(8,2)
    var newDate=new Date();
    newDate.setDate(day)
    newDate.setMonth(month-1)
    newDate.setYear(year)
    return newDate
}

document.addEventListener('DOMContentLoaded', function() {
    (oneYearBefore=new Date()).setFullYear(oneYearBefore.getFullYear()-1)
    document.getElementById("enlistmentDate").value = formatDate(oneYearBefore,"YYYY-MM-DD");
    document.getElementById("a1cDate").value = formatDate(oneYearBefore,"YYYY-MM-DD");
    calculate();
}, false);

function calculate() {

    // reset error
    document.getElementById("error").innerHTML = "";

    // gather all of the important elements on the page
    var enlistmentDate = parse(document.getElementById("enlistmentDate").value);
    console.log(document.getElementById("enlistmentDate").value)
    var a1cDate = parse(document.getElementById("a1cDate").value);

    var btzBoardDate = document.getElementById("btzBoardDate");
    var sraBTZSewOnDate = document.getElementById("sraBTZSewOnDate");
    var sraSewOnDate = document.getElementById("sraSewOnDate");

    // calculate tis (Time In Service) and tig (Time In Grade for A1C) eligibility dates
    var tis36 = addMonths(enlistmentDate,36);
    var tig20 = addMonths(a1cDate,20);
    var tig28 = addMonths(a1cDate,28);

    console.log("\n\n36 mo TIS: "+ formatDate(tis36,"MMMM Do, YYYY"));
    console.log("20 mo TIG: "+ formatDate(tig20,"MMMM Do, YYYY"));
    console.log("28 mo TIG: "+ formatDate(tig28,"MMMM Do, YYYY"));

    // Check for date order
    // Check for invalid date entry format
    // Check if TIG at 28 mo is before TIS at 36 mo
    // Check if TIG at 20 mo is at or before TIS at 36 mo
    // Check if TIG at 20 mo is after TIS at 36 mo
    // Display an error if nothing else works
    if (a1cDate < enlistmentDate) {
        document.getElementById("error").innerHTML = "You cannot sew on A1C before your Enlistment Date.";
    } else 
    try{
        formatDate(tis36,"MMMM Do, YYYY")
        formatDate(tig20,"MMMM Do, YYYY")
        if (tig28 <= tis36) {
            sraSewOnDate.innerHTML = formatDate(tig28,"MMMM Do, YYYY");
            sraBTZSewOnDate.innerHTML = formatDate(tig28=addMonths(tig28,-6),"MMMM Do, YYYY");
            btzBoardDate.innerHTML = calculateBoardDate(tig28);
        } else if (tig20 <= tis36) {
            sraSewOnDate.innerHTML = formatDate(tis36,"MMMM Do, YYYY");
            sraBTZSewOnDate.innerHTML = formatDate(tis36=addMonths(tis36,-6),"MMMM Do, YYYY");
            btzBoardDate.innerHTML = calculateBoardDate(tis36);
        } else if (tis36 < tig20) {
            sraSewOnDate.innerHTML = formatDate(tig20,"MMMM Do, YYYY");
            sraBTZSewOnDate.innerHTML = formatDate(tig20=addMonths(tig20,-6),"MMMM Do, YYYY");
            btzBoardDate.innerHTML = calculateBoardDate(tig20);
        } else {
            document.getElementById("error").innerHTML = "Oops! Something went wrong calculating your dates. Please send a screen shot to kevinfalting@gmail.com to have it corrected.";
        }
    } catch(e){
        console.error(e)
        document.getElementById("error").innerHTML = "Oops, make sure you typed in the date correctly.\nFormat: mm/dd/yyyy";
    }
}

// returns the month of the quarter prior to the month they would sew on BTZ
function calculateBoardDate(btzDate) {
    var year = btzDate.getFullYear();
    var quarter = Math.ceil((btzDate.getMonth()+1)/3)-1; // select the quarter previous ttig28=o the quarter you would sew on SrA    
    if (quarter<0){
        quarter+=4
    }

    var newDate=new Date()

    switch (quarter) {
        case 0:
            newDate.setFullYear(year-1)
            newDate.setMonth(11)
            return formatDate(newDate,"MMMM YYYY");
        case 1:
        case 2:
        case 3:
            newDate.setFullYear(year)
            newDate.setMonth(quarter*3-1)
            return formatDate(newDate,"MMMM YYYY");
        default:
            console.error("Something went wrong when it calculated the quarter.");
    }
}