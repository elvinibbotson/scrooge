function id(el) {
	return document.getElementById(el);
}

function pp(p) { // convert pence to pounds.pence (2 decimals)
	p=Math.abs(p);
	var amount=Math.floor(p/100)+".";
	var pence=p%100;
	if(pence<10) amount+="0";
	amount+=pence;
	return amount;
}

function trim(text,len) { // trime text to len characters
	if(text.length>len) text=text.substr(0,len-3)+"...";
	return text;
}

function day(d) { // get day number from date d
	// console.log('day number for '+d);
	return Math.floor(new Date(d).getTime()/86400000);
}

var scrW; // NEW - screen size
var scrH;
var dragStart={};
var db=null;
var accounts=[]; 
var accountNames=[];
var account=null;
var acIndex=null;
var investment=false; // NEW FLAG
var transactions=[];
var tx=null;
var grandTotal=0;
var listName='Accounts';
var view='list'; // NEW
var canvas=null; // NEW
var lastSave=null;
var months="JanFebMarAprMayJunJulAugSepOctNovDec";

// DRAG LEFT/RIGHT ACTIONS
id('main').addEventListener('touchstart', function(event) {
    // console.log(event.changedTouches.length+" touches");
    dragStart.x=event.changedTouches[0].clientX;
    dragStart.y=event.changedTouches[0].clientY;
    // console.log('start drag at '+dragStart.x+','+dragStart.y);
})
id('main').addEventListener('touchend', function(event) {
    var dragX=event.changedTouches[0].clientX-dragStart.x;
    if(view=='list') { // list view
    	if(dragX>50) { // drag right to decrease depth...
        	console.log("BACK");
	    	account=null;
	    	toggleDialog('txDialog',false);
	    	listAccounts();
    	}
    	else if(dragX<-50) { // drag left to switch to graph view
    		view='graph';
    		id('listPanel').style.display='none';
    		id('heading').style.display='none';
    		drawGraph();
    	}
    }
    else { // graph view
    	if(dragX>50) { // drag right to return to list view
    		view='list';
    		id('graphPanel').style.display='none';
    		id('graphOverlay').style.display='none';
    		id('listPanel').style.display='block';
    		id('heading').style.display='block';
    	}
    }
})

// NEW BUTTON: create new account or transaction
id('buttonNew').addEventListener('click',function() {
	console.log("new");
	var d=new Date().toISOString();
    if(!account) { // no account open - show new account dialog
		console.log("new account");
		toggleDialog('newAccountDialog',true);
		id('newAccountNameField').value="";
		id('newAccountDateField').value=d.substr(0,10);
		id('newAccountDateField').disabled=false;
		id("newAccountBalanceField").value=null;
		id('newAccountBalanceField').placeholder="£.pp";
		id('newAccountInvestmentFlag').checked=false; // NEW
	}
	else { // if viewing account, show transaction dialog
		toggleDialog('txDialog',true);
		console.log("new transaction in "+account.name+" account");
		txIndex=null;
		tx={};
		tx.checked=false;
		var n=0;
		while(id('txAccountChooser').options[n].text!=account.name) n++;
		console.log("account #"+n);
		id('txAccountChooser').selectedIndex=n;
		id('txAccountChooser').disabled=false;
		// var d=new Date().toISOString();
		id('txDateField').value=d.substr(0,10);
		id('txDateField').disabled=false;
		id('txSign').innerHTML=(investment)?'=':'-';
		id('txAmountField').value=null;
		id('txAmountField').placeholder="£.pp";
		console.log("set text to blank");
		id('txTextField').value="";
		id('txTextField').disabled=false;
		id('txTransferChooser').selectedIndex=0;
		id('txTransferChooser').disabled=investment;  // NEW - WAS id('txTransferChooser').disabled=false;
		id('txMonthly').checked=false;
		id('txMonthly').disabled=false;
		id('txBalance').style.color='gray';
		id("buttonDeleteTx").disabled=true;
		id('buttonDeleteTx').style.color='gray';
	}
})

// TOGGLE ACCOUNT STARTING BALANCE SIGN
id('acSign').addEventListener('click', function() {
	var s=id('acSign').innerHTML;
	console.log("toggle sign - currently "+s);
  	if(s=='+') id('acSign').innerHTML="-";
	else id('acSign').innerHTML="+";
})

// SAVE NEW ACCOUNT
id('buttonAddNewAccount').addEventListener('click',function() {
	var name=id('newAccountNameField').value;
	if((name.length>0)&&(accounts.indexOf(name)<0)) {
		var amount=Math.round(id('newAccountBalanceField').value*100); // save amounts and balances as pence
		if(id('acSign').innerHTML=="-") amount*=-1;
		var ac={name: name, balance: amount};
		console.log("new account name: "+ac.name+"; amount: "+ac.balance+" pence");
	  	accounts.push(ac);
		var tx={};
		tx.date=id('newAccountDateField').value; // NEW REPLACES...
		// tx.date=new Date().toISOString();
		tx.account=name;
		tx.amount=amount;
		tx.text="B/F";
		tx.checked=false;
		tx.transfer="none";
		if(id('newAccountInvestmentFlag').checked) tx.transfer="investment";
		tx.monthly=false;
		transactions.push(tx);
		toggleDialog('newAccountDialog', false);
		listAccounts();
		var dbTransaction=db.transaction('logs',"readwrite");
		console.log("indexedDB transaction ready");
		var dbObjectStore=dbTransaction.objectStore('logs');
		console.log("indexedDB objectStore ready");
		var request=dbObjectStore.add(tx);
		request.onsuccess=function(event) {console.log("transaction added - investment: "+tx.transfer);};
		request.onerror=function(event) {console.log("error adding new transaction");};
	  }
})

// CANCEL NEW ACCOUNT
id('buttonCancelNewAccount').addEventListener('click', function() {
    toggleDialog('newAccountDialog', false);
})

// CHANGE TRANSACTION DATE
id('txDateField').addEventListener('change', function() {
	console.log("change date");
})

// TOGGLE TRANSACTION AMOUNT SIGN
id('txSign').addEventListener('click', function() {
	var s=id('txSign').innerHTML;
	console.log("toggle sign - currently "+s);
	if(s=='+') id('txSign').innerHTML="-";
	else if(investment && (s=='-')) id('txSign').innerHTML="="; // NEW INVESTMNET TRANSACTIONS CAN JUST BE =NEW VALUE
	else id('txSign').innerHTML="+";
	event.preventDefault();
	event.stopPropagation();
})

// SAVE NEW/EDITED TRANSACTION
id('buttonSaveTx').addEventListener('click', function() {
	tx.account=accountNames[id('txAccountChooser').selectedIndex];
	// tx.checked=id('txCheckbox').checked;
	tx.date=id('txDateField').value;
	tx.amount=Math.round(id('txAmountField').value*100);
	if(id('txSign').innerHTML=="-") tx.amount*=-1;
	if(id('txSign').innerHTML=="=") tx.text='gain'; // NEW - amount IS INVESTMENT VALUE
	else tx.text=id('txTextField').value;
	if(investment) transfer=null; // NEW
	else {
		var i=id('txTransferChooser').selectedIndex;
		var transfer=id('txTransferChooser').options[i].text;
		console.log("transfer change to:"+transfer);
		if((transfer=="none")||(transfer==tx.transfer)) transfer=null; // (usually) no need to create reciprocal transaction
		tx.transfer=id('txTransferChooser').options[i].text;
	}
	tx.monthly=id('txMonthly').checked;
    toggleDialog('txDialog',false);
	console.log("save transaction - date: "+tx.date+" "+tx.amount+"p - "+tx.text+" app.txIndex: "+txIndex);
	// save new/amended transaction to indexedDB
	var dbTransaction=db.transaction('logs',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('logs');
	console.log("indexedDB objectStore ready");
	if(txIndex==null) { // add new transaction
		var earliest=transactions[0].date; // date of earliest transaction inaccount
		console.log("add new transaction date "+tx.date+" - oldest is "+earliest);
		if(tx.date<earliest) alert("TOO EARLY");
		else { // add new transaction to indexedDB
			var request=dbObjectStore.add(tx);
			request.onsuccess=function(event) {
				console.log("new transaction added");
				openAccount(); // reloads and sorts account transactions
			};
			request.onerror=function(event) {console.log("error adding new transaction");};
		}
	}
	else {
		console.log("save amended transaction# "+txIndex+"("+transactions[txIndex]+"): "+tx.account+"/"+tx.date+"/"+tx.amount+"p/"+tx.text);
		transactions[txIndex]=tx;
		// put amended transaction in indexedDB
		var request=dbObjectStore.put(tx); // update transaction in database
		request.onsuccess=function(event)  {
			console.log("transaction "+tx.id+" updated");
			openAccount(); // reloads and sorts account transactions
		};
		request.onerror = function(event) {console.log("error updating transaction "+tx.id);};
	}
	if(transfer) { // IF NECESSARY CREATE RECIPROCAL TRANSACTION IN TRANSFER ACCOUNT
		console.log("create reciprocal transaction");
		var t={};
		t.account=tx.transfer;
		t.checked=false;
		t.date=tx.date;
		t.amount=-1*tx.amount;
		t.text=tx.account;
		t.transfer="none";
		t.monthly=false;
		var request=dbObjectStore.add(t);
		request.onsuccess = function(event) {
			console.log("reciprocal transaction added in "+transfer+" account");
			alert("transaction added to "+transfer+" account");
		};
		request.onerror=function(event) {console.log("error adding reciprocal transaction");};
	}
})

// CANCEL NEW/EDIT TRANSACTION
id('buttonCancelTx').addEventListener('click', function() {
    toggleDialog('txDialog', false);
})

// DELETE TRANSACTION
id('buttonDeleteTx').addEventListener('click', function() {
	var text=tx.text;
	console.log("delete transaction "+text);
	toggleDialog("deleteDialog", true);
	id('deleteText').innerHTML=text;
	toggleDialog("txDialog",false);
})

// CONFIRM DELETE
id('buttonDeleteConfirm').addEventListener('click', function() {
	console.log("delete transaction "+txIndex+" - "+tx.text);
	transactions.splice(txIndex,1);
	var dbTransaction=db.transaction("logs","readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore("logs");
	var request=dbObjectStore.delete(tx.id);
	request.onsuccess=function(event) {console.log("transaction "+tx.id+" deleted");};
	request.onerror=function(event) {console.log("error deleting transaction "+tx.id);};
	toggleDialog('deleteDialog', false);
	buildTransactionsList();
})

// CANCEL DELETE
id('buttonCancelDelete').addEventListener('click', function() {
    toggleDialog('deleteDialog', false);// just close the delete dialog
})

// SHOW/HIDE DIALOGS
function toggleDialog(d,visible) {
	id('buttonNew').style.display=(visible)? 'none':'block';
	if(d=='newAccountDialog') { // toggle new account dialog
	    if(visible) {
		id("newAccountDialog").style.display='block';
    	} 
    	else {
      		id("newAccountDialog").style.display='none';
    	}
	}
	else if(d=='txDialog') { // toggle transaction dialog
	    if(visible) {
      		id("txDialog").style.display='block';
    	}
    	else {
      		id("txDialog").style.display='none';
    	}
	}
	else if(d=='deleteDialog') { // toggle DELETE dialog
	  	if(visible) {
      		id('deleteDialog').style.display='block';
   		}
   		else {
     		id('deleteDialog').style.display='none';
    	}
	}
	else if(d=='importDialog') { // toggle file chooser dialog
	    if (visible) {
      		id('importDialog').style.display='block';
    	}
    	else {
      		id('importDialog').style.display='none';
    	}
	}
}
  
// OPEN SELECTED TRANSACTION FOR EDITING
function openTx() {
	tx=transactions[txIndex];
	console.log("transaction date: "+tx.date);
	console.log("open transaction: "+txIndex+"; "+tx.text);
	toggleDialog('txDialog',true);
	id('txAccountChooser').selectedIndex=accountNames.indexOf(tx.account);
	id('txDateField').value=tx.date.substr(0,10);
	// id('txAmountField').value=pp(tx.amount);
	id('txTextField').value=tx.text;
	id('txBalance').innerHTML=pp(tx.balance);
	id('txBalance').style.color=(tx.balance<0)?'yellow':'white';
	var i=0;
	if(investment) { // NEW - NO TRANSFERS IN INVESTMENTS
		id('txTransferChooser').disabled=true;
		id('txMonthly').disabled=true;
	}
	else {
		while(id('txTransferChooser').options[i].text!=tx.transfer) i++;
		id('txTransferChooser').selectedIndex=i;
		id('txMonthly').checked=tx.monthly;
	}
	id('buttonDeleteTx').disabled=false;
	id('txSign').innerHTML=(tx.amount<0)?"-":"+";
	if(tx.text=='gain') { // NEW CODE...
		id('txSign').innerHTML='=';
		id('txTextField').value='';
		id('txTextField').disabled=true;
	}
	else {
		id('txTextField').value=tx.text;
		id('txTextField').disabled=false;
	}
	if(tx.text=="B/F") { // can only change date or amount of earliest B/F item
		console.log("limit edits");
		id('txAccountChooser').disabled=true;
		id('txDateField').disabled=true;
		id('txTextField').disabled=true;
		id('txTransferChooser').disabled=true;
		id('txMonthly').disabled=true;
		if(transactions.length>1) { // can only delete B/F if it is only transaction - effectively deletes account
		    id('buttonDeleteTx').disabled=true;
		}
	}
	else {
		console.log("full editing");
		id('txAccountChooser').disabled=false;
		id('txDateField').disabled=false;
		id('txTextField').disabled=false;
		id('txTransferChooser').disabled=false;
		id('txMonthly').disabled=false;
		id('buttonDeleteTx').disabled=false;
	}
}
  
// LIST ACCOUNTS
function listAccounts() {
	console.log("list "+accounts.length+" accounts")
  	var item = null;
	id('list').innerHTML="";
	var html="Accounts";
	if(accounts.length>0) {
	    accounts.sort(function(a,b) { return (a.name>b.name)?1:-1}); //alpha-sort on account names
		console.log("accounts sorted - first: "+accounts[0].name);
		while(id('txAccountChooser').options.length>0)  id('txAccountChooser').options.remove(0);  // clear account lists
		while(id('txTransferChooser').options.length>0)  id('txTransferChooser').options.remove(0);
		accountNames=[];
		grandTotal=0;
		var ac=document.createElement('option');
		ac.text="none";
		ac.index=0;
		id('txTransferChooser').options.add(ac);
		for(var i in accounts) {
		    accountNames.push(accounts[i].name);
			grandTotal+=parseInt(accounts[i].balance);
			var listItem=document.createElement('li'); // add account to accounts list...
			listItem.index=i;
	  		listItem.classList.add('list-item');
			html="<b>"+trim(accounts[i].name,20)+"</b>";
			if(accounts[i].balance<0) html+="<span class='amount-debit'>";
			else html+="<span class='amount'>";
			html+=pp(accounts[i].balance)+"</span>";
			listItem.innerHTML=html;
			listItem.addEventListener('click', function(){acIndex=this.index; openAccount();});
			id('list').appendChild(listItem);
			ac=document.createElement('option'); // ...and to account chooser...
			ac.index=i;
			ac.text=accounts[i].name;
			id('txAccountChooser').options.add(ac);
			ac=document.createElement('option'); // ...and transfer chooser
			ac.index=i+1;
			ac.text=accounts[i].name;
			id('txTransferChooser').options.add(ac);
	  	}
	  	console.log("transfer option 0: "+id('txTransferChooser').options[0].text);
		html="Accounts <i>"+pp(grandTotal)+"</i>";
	}
	id('headerTitle').innerHTML=html;
	var today=new Date();
	if(today.getMonth()!=lastSave) { // backup every month
        console.log("BACKUP");
        backup();
    }
}
  
// OPEN ACCOUNT
function openAccount() {
    account=accounts[acIndex];
	console.log("open account #"+acIndex+": "+account.name);
	transactions=[];
	var dbTransaction=db.transaction('logs',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('logs');
	console.log("indexedDB objectStore ready");
	var request=dbObjectStore.openCursor();
	request.onsuccess=function(event) {
		var cursor=event.target.result;
    		if(cursor) {
				if(cursor.value.account==account.name) {
					transactions.push(cursor.value);
					console.log("transaction "+cursor.key+", id: "+cursor.value.id+", date: "+cursor.value.date+", "+cursor.value.amount+" pence, monthly:"+cursor.value.monthly);
				}
				cursor.continue();
    		}
			else {
				console.log(transactions.length+" account transactions");
    			transactions.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); //chronological order
    			investment=transactions[0].transfer=='investment'; // NEW
    			console.log('investment account: '+investment); // NEW
	  			if(transactions.length>50) { // limit each account to latest 50 transactions}
					console.log(">50 transactions - deleting earliest");
					transactions[1].amount+=transactions[0].amount; // create new B/F item for account
					transactions[1].text="B/F";
					request=dbObjectStore.put(transactions[1]); // update transaction in database
					request.onsuccess=function(event)  {console.log("new B/F transaction  updated");};
					request.onerror=function(event) {console.log("error updatingnew B/F transaction");};
					request=dbObjectStore.delete(transactions[0].id);
					request.onsuccess=function(event) {
						transactions.shift();
						console.log("earliest transaction deleted");
						buildTransactionsList();
					}
					request.onerror = function(event) {console.log("error deleting earliest transaction");};
	  			}
				else buildTransactionsList();
			}
		}
}
  
// LIST ACCOUNT TRANSACTIONS
function buildTransactionsList() {
	 var item=null;
	 id('list').innerHTML="";
	 var html="";
	 var tx={};
	 var d="";
	 var mon=0;
	 var balance=0;
	 console.log("list "+transactions.length+" transactions");
	 for(var i in transactions) {
	 	if(transactions[i].text=='gain') balance=transactions[i].amount; // NEW
		else balance+=transactions[i].amount;
		transactions[i].balance=balance; // save balance after each transaction in account
	 }
	 for(var i=transactions.length-1;i>=0;i--) { // latest at top
		var listItem=document.createElement('li');
		listItem.index=i;
	  	listItem.classList.add('list-item');
		tx=transactions[i];
		var itemCheck=document.createElement('input');
	 	itemCheck.setAttribute('type','checkbox');
	 	itemCheck.setAttribute('class','check');
	 	itemCheck.index=i;
	 	itemCheck.checked=tx.checked;
	 	itemCheck.addEventListener('change',function() { // toggle.checked property
	 	    tx=transactions[this.index];
	 	    tx.checked=!tx.checked;
	 	    console.log("checked is "+tx.checked);
	 	    var dbTransaction=db.transaction('logs',"readwrite");
        	var dbObjectStore=dbTransaction.objectStore('logs');
	        console.log("database ready");
	 	    var request=dbObjectStore.put(tx); // update transaction in database
		    request.onsuccess=function(event)  {
			    console.log("transaction "+tx.id+" updated");
    		};
		    request.onerror = function(event) {console.log("error updating transaction "+tx.id);};
	 	});
	 	listItem.appendChild(itemCheck);
		var itemText=document.createElement('span');
		itemText.style='margin-right:50px;';
		itemText.index=i;
		d=tx.date;
		console.log("date: "+d);
		mon=parseInt(d.substr(5,2))-1;
		mon*=3;
		d=d.substr(8,2)+" "+months.substr(mon,3); // +" "+d.substr(2,2);
		html="<span class='date'>"+d+"</span> "+trim(tx.text,10);
		var a=tx.amount; // NEW
		if(investment && tx.text=='gain') a=tx.amount-transactions[i-1].balance; // NEW LIST GAIN/LOSS FROM PREVIOUS BALANCE
		if(a<0) html+="<span class='amount-debit'>";
		else html+="<span class='amount'>";
		html+=pp(a);
		itemText.innerHTML=html;
		itemText.addEventListener('click', function(){txIndex=this.index; openTx();});
		listItem.appendChild(itemText);
		id('list').appendChild(listItem);
	 }
	 id('txSign').innerHTML='-'; // default to debit
	 accounts[acIndex].balance=balance;
	 html=trim(account.name,12)+" <i>";
	 if(balance<0) html+=" -";
	 else html+=" ";
	 html+=pp(balance)+"</i>";
	 id('headerTitle').innerHTML=html;
}

// NEW - DRAW GRAPH
function drawGraph() {
	console.log('GRAPH');
	var firstDay=day(transactions[0].date); // whole days
	var lastDay=day(transactions[transactions.length-1].date);
	var n=lastDay-firstDay;
	var dayW=scrW/n; // pixels/day
	console.log('graph spans '+n+' days from '+firstDay+' to '+lastDay);
	console.log('screen width: '+scrW+'; '+transactions.length+' transactions'); // canvasL is '+canvasL+'; width is '+id('canvas').width);
	id('graphPanel').style.display='block';
	// var margin=120; // bottom margin
	// set vertical scale
	var max=0; // maximum (or minimum if debit) balance
	for(var i=0; i<transactions.length;i++) if(Math.abs(transactions[i].balance)>max) max=Math.abs(transactions[i].balance);
	max/=100;
	console.log('maximum balance: £'+max);
	var d=0; // no of digits
	n=1;
	while(n<max) { // count digits
		n*=10;
		d++;
	}
	console.log(d+' digits'); 
	n/=10; // determine scale limit
	var m=n;
	while(m<max) m+=n; // m is next multiple of £10, £100, £1000, etc above max
	ppp=scrH/2/m; // pixels per pound
	console.log(ppp+' px/£');
	// draw graph of balance against days/transactions
	canvas.clearRect(0,0,scrW,scrH);
	canvas.strokeStyle='yellow';
	canvas.lineWidth=3;
	canvas.beginPath();
	for(i=0;i<transactions.length;i++) {
		var val=transactions[i].balance/100;
		var x=(day(transactions[i].date)-firstDay)*dayW;
		var y=scrH/2-val*ppp; // £0.00 is at mid-screen
		alert('balance: '+val+'point '+i+': '+x+','+y);
		if(i<1) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
	}
    canvas.stroke();
    // draw £ scale
    canvas.font='20px Monospace';
    canvas.fillStyle='white';
    canvas.textAlign='left';
    canvas.textBaseline='middle';
    y=0;
    var unit=Math.pow(10,d-1); // 1, 10, 100, 1000,...
    var n=0;
    console.log('m: '+m+' digits: '+d+' unit: '+unit);
    while(n<m) { // from 0 to >max
    	// console.log('write '+n+' at '+x+','+y);
    	canvas.fillText(-n,5,scrH/2-y);
    	canvas.fillText(n,5,scrH/2+y);
    	n+=unit;
    	y-=unit*ppp;
    }
    d=transactions[0].date;
    m=parseInt(d.substr(5,2))-1;
	m*=3;
	n=months.substr(m,3)+"'"+d.substr(2,2); // date format Mon 'YY
	console.log('print '+n);
	canvas.textBaseline='top';
	canvas.fillText(n,5,5);
	d=transactions[transactions.length-1].date;
    m=parseInt(d.substr(5,2))-1;
	m*=3;
	n=months.substr(m,3)+"'"+d.substr(2,2); // date format Mon 'YY
	canvas.textAlign='right';
	canvas.fillText(n,scrW-5,5);
	alert('graph drawn; last date: '+d+'; last balance: '+transactions[transactions.length-1].balance/100);
}

// RESTORE FILE
function restore() {
    toggleDialog("importDialog", true);
}

// IMPORT FILE
id("fileChooser").addEventListener('change', function() {
	var file=id('fileChooser').files[0];
	console.log("file: "+file+" name: "+file.name);
	var fileReader=new FileReader();
	fileReader.addEventListener('load', function(evt) {
		console.log("file read");
	  	var data=evt.target.result;
		var json=JSON.parse(data);
		console.log("json available");
		var logs=json.logs;
		console.log(logs.length+" logs");
		var dbTransaction=db.transaction('logs',"readwrite");
		var dbObjectStore=dbTransaction.objectStore('logs');
		for(var i=0;i<logs.length;i++) {
			console.log("add "+logs[i].text);
			var request=dbObjectStore.add(logs[i]);
			request.onsuccess=function(e) {
				console.log(logs.length+" logs added to database");
			};
			request.onerror=function(e) {console.log("error adding log");};
		};
		toggleDialog('importDialog',false);
		alert("transaction logs imported - restart");
  	});
  	fileReader.readAsText(file);
})

// CANCEL IMPORT
id('buttonCancelImport').addEventListener('click', function() {
    toggleDialog('importDialog', false);
 });

// BACKUP FILE
function backup() {
	var fileName="money.json";
	var logs=[];
	var dbTransaction=db.transaction('logs',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('logs');
	console.log("indexedDB objectStore ready");
	var request=dbObjectStore.openCursor();
	request.onsuccess=function(event) {
		var cursor=event.target.result;
    	if(cursor) {
			logs.push(cursor.value);
			console.log("transaction "+cursor.key+", id: "+cursor.value.id+", date: "+cursor.value.date+", "+cursor.value.amount+" pence");
			cursor.continue();
    	}
		else {
			console.log(logs.length+" transaction logs - sort and save");
    		logs.sort(function(a,b) {return Date.parse(a.date)-Date.parse(b.date)}); //chronological order
			var data={'logs': logs};
			var json=JSON.stringify(data);
			var blob=new Blob([json],{type:"data:application/json"});
  			var a=document.createElement('a');
			a.style.display='none';
    		var url = window.URL.createObjectURL(blob);
			console.log("data ready to save: "+blob.size+" bytes");
   		 	a.href= url;
   		 	a.download = fileName;
    		document.body.appendChild(a);
    		a.click();
			alert(fileName+" saved to downloads folder");
			var today=new Date();
			lastSave=today.getMonth();
			window.localStorage.setItem('saveDate',lastSave); // remember month saved
		}
	}
}
    
// START-UP CODE
console.log("START");
var scrW=screen.width; // NEW CODE - SET UP FOR GRAPHS
var scrH=screen.height;
console.log('screen size: '+scrW+'x'+scrH+'px');
// dayW=scrW/30; // approx 1 month visible in graph
// console.log('dayW: '+dayW+'px');
id("canvas").width=scrW;
id("canvas").height=scrH;
console.log('canvas size: '+id("canvas").width+'x'+id("canvas").height);
// id("overlay").width=scrW;
// id("overlay").height=scrH;
canvas=id('canvas').getContext('2d');
// overlay=id('overlay').getContext('2d');
lastSave=window.localStorage.getItem('saveDate'); // date of last backup
// console.log("last save month: "+lastSave);
var request=window.indexedDB.open("transactionsDB");
request.onerror=function(event) {
	alert("indexedDB error");
};
request.onupgradeneeded=function(event) {
	console.log("UPGRADE!")
	db=event.currentTarget.result;
	var dbObjectStore=db.createObjectStore("logs",{ keyPath:"id",autoIncrement:true });
	alert("database ready");
};
request.onsuccess=function(event) {
	db=event.target.result;
	console.log("DB open");
	var dbTransaction=db.transaction('logs',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('logs');
	console.log("indexedDB objectStore ready");
	transactions=[];
	console.log("transactions array ready");
	var request=dbObjectStore.openCursor();
	request.onsuccess=function(event) {
		var cursor=event.target.result;
    	if(cursor) {
			transactions.push(cursor.value);
			cursor.continue();
    	}
		else {
			console.log("No more entries! "+transactions.length+" transactions");
			if(transactions.length<1) { // if no transactions...
			    toggleDialog("importDialog", true); // ...offer to recover from backup
			    return;
			}
    		transactions.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); //chronological order
   			accounts=[];
			var acNames=[];
    		// NOT NEEDED: var acBalances=[];
    		var n=0;
    		for(var i in transactions) { // build list of accounts
				var today=new Date();
				var months=today.getFullYear()*12+today.getMonth()+1; // months count
    			today=today.getDate();
    			if(transactions[i].monthly) {
    				console.log("monthly repeat check");
					var transfer=false;
    				var txDate=transactions[i].date; // YYYY-MM-DD
    				var txMonths=parseInt(txDate.substr(0,4))*12+parseInt(txDate.substr(5,2)); // months count
    				var txDay=txDate.substr(8,2);
    				if((((months-txMonths)>1))||(((months-txMonths)==1)&&(today>=txDay))) { // one month or more later
    					console.log(">> add repeat transaction for "+transactions[i].text);
						transactions[i].monthly=false; // cancel monthly repeat
    					// put amended transaction in indexedDB
						var request=dbObjectStore.put(transactions[i]); // update transaction in database
						request.onsuccess=function(event)  {
							console.log("transaction updated");
						};
						request.onerror=function(event) {
							console.log("error updating transfer/monthly: "+request.error);
						};
    					var tx={}; // create repeat transaction
    					tx.account=transactions[i].account;
    					console.log('repeat tx account: '+tx.account);
    					txMonths+=1; // next month (could be next year too)
    					tx.date=Math.floor(txMonths/12).toString()+"-";
						txMonths%=12;
    					if(txMonths<10) tx.date+='0'; // isoDate+="0";
    					tx.date+=txMonths.toString()+"-"+txDay;
    					console.log('repeat tx date: '+tx.date);
    					console.log("monthly transaction date: "+txDate+"; repeat: "+tx.date);
    					tx.amount=transactions[i].amount;
    					tx.checked=false;
						tx.text=transactions[i].text;
						tx.transfer=transactions[i].transfer;
    					var transferTX={};
    					if(tx.transfer!="none") {
    						transfer=true;
    						transferTX.account=tx.transfer;
    						transferTX.checked=false;
							transferTX.date=tx.date;
							transferTX.amount=-1*tx.amount;
    						transferTX.text=tx.account;
    						transferTX.monthly=false;
    					}
    					tx.monthly=true;
    					// put new repeat transaction in indexedDB
    					request=dbObjectStore.add(tx);  // add new transaction to database
						request.onsuccess=function(event) {
							console.log("repeat transaction added");
						};
						request.onerror=function(event) {
							console.log("error adding new repeat transaction: "+request.error);
						};
					}
					if(transfer) { // IF MONTHLY TRANSACTION IS TRANSFER CREATE RECIPROCAL TRANSACTION
						request=dbObjectStore.add(transferTX);
						request.onsuccess=function(event) {
							alert("reciprocal transaction created to match repeated transaction");
						}
						request.onerror=function(event) {
							alert("error creating repeated reciprocal transaction");
						}
					}
    			}  // END OF REPEAT TRANSACTION CODE
    			n=acNames.indexOf(transactions[i].account);
		  		if(n<0) {
	  				console.log("add account "+transactions[i].account);
	  				acNames.push(transactions[i].account);
	  				accounts.push({name: transactions[i].account, balance: transactions[i].amount}); // NEW CODE REPLACES...
	  				/* OLD CODE
	   				acNames.push(transactions[i].account);
	  				acBalances.push(transactions[i].amount);
	  				*/
	  			}
	  			else { // NEW CODE FOLLOWS...
	  				if(transactions[i].text=='gain') accounts[n].balance=transactions[i].amount; // NEW
					else accounts[n].balance+=transactions[i].amount;
	  				// OLD CODE: acBalances[n]+=transactions[i].amount;
	  			}
    		}
    		/* NOT NEEDED...
			for(n in acNames) {
  				accounts.push({name: acNames[n], balance: acBalances[n]});
  			}
  			*/
  			console.log(accounts.length+" accounts");
			listAccounts();
		}
	}
}
// implement service worker if browser is PWA friendly
if(navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
}
else { // Register the ServiceWorker
	navigator.serviceWorker.register('moneySW.js', {scope: '/scrooge/'}).then(function(reg) {
	    console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}
