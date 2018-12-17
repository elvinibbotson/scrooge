function id(el) {
	// console.log("return element whose id is "+el);
	return document.getElementById(el);
}

function pp(p) {
	// convert pence to pounds.pence (2 decimals)
	p=Math.abs(p);
	var amount=Math.floor(p/100)+".";
	var pence=p%100;
	if(pence<10) amount+="0";
	amount+=pence;
	return amount;
}

function trim(text,len) {
	if(text.length>len) text=text.substr(0,len-3)+"...";
	return text;
}

var notifications=[];

function notify(note) {
		notifications.push(note);
		while(notifications.length>25) notifications.shift();
		console.log(note);
	}
	
	function showNotifications() {
		var message="";
		for(var i in notifications) {
			message+=notifications[i]+"; ";
		}
		alert(message);
		document.getElementById('menu').style.display='none';
	}

(function() {
 // 'use strict';
	
    var app = {
	db: null,
	accounts: [],
	accountNames: [],
	account: null,
	acIndex: null,
	transactions: [],
	tx: null,
	grandTotal: 0,
	listName: 'Accounts',
	lastSave: null,
	// transferChange: false,
	months: "JanFebMarAprMayJunJulAugSepOctNovDec"
  };

  // EVENT LISTENERS
  document.getElementById("main").addEventListener('click', function() {
	id("menu").style.display="none";
  })
  
  document.getElementById('buttonMenu').addEventListener('click', function() { // MENU BUTTON
		var display = id("menu").style.display;
		if(display == "block") id("menu").style.display = "none";
		else id("menu").style.display = "block";
	});
	
  document.getElementById("import").addEventListener('click', function() { // IMPORT OPTION
  		notify("IMPORT");
		app.toggleDialog("importDialog", true);
  })
	
  document.getElementById('buttonCancelImport').addEventListener('click', function() { // CANCEL IMPORT DATA
    app.toggleDialog('importDialog', false);
	document.getElementById("menu").style.display="none";
  });
  
  document.getElementById("fileChooser").addEventListener('change', function() { // IMPORT FILE
	var file = id('fileChooser').files[0];
	notify("file: "+file+" name: "+file.name);
	var fileReader=new FileReader();
	fileReader.addEventListener('load', function(evt) {
		notify("file read: "+evt.target.result);
	  	var data=evt.target.result;
		var json=JSON.parse(data);
		notify("json: "+json);
		var transactions=json.transactions;
		notify(transactions.length+" transactions loaded");
		var dbTransaction = app.db.transaction('transactions',"readwrite");
		var dbObjectStore = dbTransaction.objectStore('transactions');
		for(var i=0;i<transactions.length;i++) {
			notify("add "+transactions[i].text);
			var request = dbObjectStore.add(transactions[i]);
			request.onsuccess = function(e) {
				notify(transactions.length+" transactions added to database");
			};
			request.onerror = function(e) {notify("error adding transaction");};
		};
		app.toggleDialog('importDialog',false);
		alert("transactions imported - restart");
  	});
  	fileReader.readAsText(file);
  },false);
  
  document.getElementById("export").addEventListener('click', function() { // EXPORT FILE
  	notify("EXPORT");
	var today= new Date();
	var fileName = "money" + today.getDate();
	var n = today.getMonth();
	fileName += app.months.substr(n*3,3);
	var n = today.getFullYear() % 100;
	if(n<10) fileName+="0";
	fileName += n + ".json";
	var dbTransaction = app.db.transaction('transactions',"readwrite");
	notify("indexedDB transaction ready");
	var dbObjectStore = dbTransaction.objectStore('transactions');
	notify("indexedDB objectStore ready");
	var request = dbObjectStore.openCursor();
	var transactions=[];
	var dbTransaction = app.db.transaction('transactions',"readwrite");
	notify("indexedDB transaction ready");
	var dbObjectStore = dbTransaction.objectStore('transactions');
	notify("indexedDB objectStore ready");
	var request = dbObjectStore.openCursor();
	request.onsuccess = function(event) {
		var cursor = event.target.result;
    		if (cursor) {
			transactions.push(cursor.value);
			notify("transaction "+cursor.key+", id: "+cursor.value.id+", date: "+cursor.value.date+", "+cursor.value.amount+" pence");
			cursor.continue();
    		}
		else {
			notify(transactions.length+" transactions - sort and save");
    			transactions.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); //chronological order
			var data={'transactions': transactions};
			var json=JSON.stringify(data);
			var blob = new Blob([json], {type:"data:application/json"});
  			var a =document.createElement('a');
			a.style.display='none';
    			var url = window.URL.createObjectURL(blob);
			notify("data ready to save: "+blob.size+" bytes");
   		 	a.href= url;
   		 	a.download = fileName;
    			document.body.appendChild(a);
    			a.click();
			alert(fileName+" saved to downloads folder");
			document.getElementById("menu").style.display="none";

		}
	}
  })
  
  document.getElementById('diagnostics').addEventListener('click', showNotifications);
    
  document.getElementById('buttonBack').addEventListener('click', function() { // BACK BUTTON: close open account
	// return to accounts list
	app.account=null;
	id("buttonBack").style.display="none";
	app.toggleDialog('txDialog',false);
	app.listAccounts();
  });

  document.getElementById('buttonNew').addEventListener('click', function() { // NEW BUTTON: create new account or transaction
	notify("new");
    if(!app.account) { // no account open - show new account dialog
		notify("new account");
		app.toggleDialog('newAccountDialog',true);
		id('newAccountNameField').value="";
		id("newAccountBalanceField").value=null;
		id('newAccountBalanceField').placeholder="£.pp";
	}
	else { // if viewing account, show transaction dialog
		app.toggleDialog('txDialog',true);
		notify("new transaction in "+app.account.name+" account");
		app.txIndex=null;
		app.tx={};
		var n=0;
		while(id('txAccountChooser').options[n].text!=app.account.name) n++;
		console.log("account #"+n);
		id('txAccountChooser').selectedIndex=n;
		id('txAccountChooser').disabled=false;
		id('txCheckbox').checked=false;
		var d=new Date().toISOString();
		id('txDateField').value=d.substr(0,10);
		id('txDateField').disabled=false;
		id('txAmountField').value=null;
		id('txAmountField').placeholder="£.pp";
		console.log("set text to blank");
		id('txTextField').value="";
		id('txTextField').disabled=false;
		id('txTransferChooser').selectedIndex=0;
		id('txTransferChooser').disabled=false;
		id('txMonthly').checked=false;
		id('txMonthly').disabled=false;
		id('txBalance').style.color='gray';
		id("buttonDeleteTx").disabled=true;
		id('buttonDeleteTx').style.color='gray';
	}
  });
  
  document.getElementById('acSign').addEventListener('click', function() { // TOGGLE +/- ACCOUNT STARTING BALANCE
	var s=id('acSign').innerHTML;
	console.log("toggle sign - currently "+s);
  	if(s=='+') id('acSign').innerHTML="-";
	else id('acSign').innerHTML="+";
  })
  
  document.getElementById('buttonAddNewAccount').addEventListener('click', function() { // SAVE NEW ACCOUNT
	  var name=id('newAccountNameField').value;
	  if((name.length>0) && (app.accounts.indexOf(name)<0)) {
		var amount=id('newAccountBalanceField').value*100; // save amounts and balances as
		if(id('acSign').innerHTML=="-") amount*=-1;
		var ac={name: name, balance: amount};
		console.log("new account name: "+ac.name+"; amount: "+ac.balance+" pence");
	  	app.accounts.push(ac);
		var tx={};
		tx.date=new Date().toISOString();
		tx.account=name;
		tx.amount=amount;
		tx.text="B/F";
		tx.checked=false;
		tx.transfer="none";
		tx.monthly=false;
		app.transactions.push(tx);
		app.toggleDialog('newAccountDialog', false);
		app.listAccounts();
		var dbTransaction = app.db.transaction('transactions',"readwrite");
		notify("indexedDB transaction ready");
		var dbObjectStore = dbTransaction.objectStore('transactions');
		notify("indexedDB objectStore ready");
		var request = dbObjectStore.add(tx);
		request.onsuccess = function(event) {console.log("transaction added");};
		request.onerror = function(event) {console.log("error adding new transaction");};
	  }
  });
  
  document.getElementById('buttonCancelNewAccount').addEventListener('click', function() { // CANCEL NEW ACCOUNT
    app.toggleDialog('newAccountDialog', false);
  });
  
  document.getElementById('txDateField').addEventListener('change', function() { // CHANGE TRANSACTION DATE
	console.log("change date");
  })

  document.getElementById('txSign').addEventListener('click', function() { // TOGGLE +/- TRANSACTION AMOUNT
	var s=id('txSign').innerHTML;
	console.log("toggle sign - currently "+s);
  	if(s=='+') id('txSign').innerHTML="-";
	else id('txSign').innerHTML="+";
	event.preventDefault();
	event.stopPropagation();
  })
  /*
  document.getElementById('txTransferChooser').addEventListener('change', function() { // SET RECIPROCAL TRANSFER ACCOUNT
  	app.transferChange=true; // set flag to check/change transaction.transfer when saving
  })
	*/
  document.getElementById('buttonSaveTx').addEventListener('click', function() { // SAVE NEW/EDITED TRANSACTION
	app.tx.account=app.accountNames[id('txAccountChooser').selectedIndex];
	app.tx.checked=id('txCheckbox').checked;
	app.tx.date=id('txDateField').value;
	app.tx.amount=Math.round(id('txAmountField').value*100);
	if(id('txSign').innerHTML=="-") app.tx.amount*=-1;
	app.tx.text=id('txTextField').value;
	var i=id('txTransferChooser').selectedIndex;
	var transfer=id('txTransferChooser').options[i].text;
	console.log("transfer change:"+app.transferChange+" currently:"+app.tx.transfer+" change(?) to:"+transfer);
	if((transfer=="none")||(transfer==app.tx.transfer)) transfer=null; // (usually) no need to create reciprocal transaction
	app.tx.transfer=id('txTransferChooser').options[i].text;
	app.tx.monthly=id('txMonthly').checked;
    app.toggleDialog('txDialog',false);
	console.log("save transaction - date: "+app.tx.date+" "+app.tx.amount+"p - "+app.tx.text+" app.txIndex: "+app.txIndex);
	// save new/amended transaction to indexedDB
	var dbTransaction = app.db.transaction('transactions',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore = dbTransaction.objectStore('transactions');
	console.log("indexedDB objectStore ready");
	if(app.txIndex==null) { // add new transaction
		var earliest=app.transactions[0].date; // date of earliest transaction inaccount
		console.log("add new transaction date "+app.tx.date+" - oldest is "+earliest);
		if(app.tx.date<earliest) alert("TOO EARLY");
		else { // add new transaction to indexedDB
			var request = dbObjectStore.add(app.tx);
			request.onsuccess = function(event) {
				console.log("new transaction added");
				app.openAccount(); // reloads and sorts account transactions
			};
			request.onerror = function(event) {console.log("error adding new transaction");};
		}
	}
	else {
		console.log("save amended transaction# "+app.txIndex+"("+app.transactions[app.txIndex]+"): "+app.tx.account+"/"+app.tx.date+"/"+app.tx.amount+"p/"+app.tx.text);
		app.transactions[app.txIndex]=app.tx;
		// put amended transaction in indexedDB
		var request = dbObjectStore.put(app.tx); // update transaction in database
		request.onsuccess = function(event)  {
			console.log("transaction "+app.tx.id+" updated");
			app.openAccount(); // reloads and sorts account transactions
		};
		request.onerror = function(event) {console.log("error updating transaction "+app.tx.id);};
	}
	// IF NECESSARY CREATE RECIPROCAL TRANSACTION IN TRANSFER ACCOUNT
	if(transfer) {
		console.log("create reciprocal transaction");
		var tx={};
		tx.account=transfer;
		tx.checked=false;
		tx.date=app.tx.date;
		tx.amount= -1 * app.tx.amount;
		tx.text=app.tx.account;
		tx.transfer="none";
		tx.monthly=false;
		var request = dbObjectStore.add(tx);
		request.onsuccess = function(event) {
			console.log("reciprocal transaction added in "+transfer+" account");
			alert("transaction added to "+transfer+" account");
			// app.openAccount(); // reloads and sorts account transactions
		};
		request.onerror = function(event) {console.log("error adding reciprocal transaction");};
	}
  });

  document.getElementById('buttonCancelTx').addEventListener('click', function() { // CANCEL NEW/EDIT TRANSACTION
    app.toggleDialog('txDialog', false);
  });
  
  document.getElementById('buttonDeleteTx').addEventListener('click', function() { // DELETE TRANSACTION
	var text=app.tx.text;
	console.log("delete transaction "+text);
	app.toggleDialog("deleteDialog", true);
	document.getElementById('deleteText').innerHTML = text;
	app.toggleDialog("txDialog", false);
  });
  
  document.getElementById('buttonDeleteConfirm').addEventListener('click', function() { // CONFIRM DELETE
	console.log("delete transaction "+app.txIndex+" - "+app.tx.text);
	app.transactions.splice(app.txIndex,1);
	var dbTransaction = app.db.transaction("transactions","readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore = dbTransaction.objectStore("transactions");
	var request = dbObjectStore.delete(app.tx.id);
	request.onsuccess = function(event) {console.log("transaction "+app.tx.id+" deleted");};
	request.onerror = function(event) {console.log("error deleting transaction "+app.tx.id);};
	app.toggleDialog('deleteDialog', false);
	app.buildTransactionsList();
  });
  
  document.getElementById('buttonCancelDelete').addEventListener('click', function() { // CANCEL DELETE
    app.toggleDialog('deleteDialog', false);// just close the delete dialog
  });

  // SHOW/HIDE DIALOGS
  app.toggleDialog = function(d, visible) {
	  if(d=='newAccountDialog') { // toggle new account dialog
	  	 if (visible) {
      		id("newAccountDialog").classList.add('dialog-container--visible');
    		} else {
      		id("newAccountDialog").classList.remove('dialog-container--visible');
    		}
	  }
	  else if(d=='txDialog') { // toggle transaction dialog
	  	 if (visible) {
      		id("txDialog").classList.add('dialog-container--visible');
    		} else {
      		id("txDialog").classList.remove('dialog-container--visible');
    		}
	  }
	  else if(d=='deleteDialog') { // toggle DELETE dialog
	  	if (visible) {
      		id('deleteDialog').classList.add('dialog-container--visible');
   		 } else {
     		id('deleteDialog').classList.remove('dialog-container--visible');
    		}
	  }
	  else if(d=='importDialog') { // toggle file chooser dialog
	  	 if (visible) {
      		id('importDialog').classList.add('dialog-container--visible');
    		} else {
      		id('importDialog').classList.remove('dialog-container--visible');
    		}
	  }
  };
  
  // OPEN SELECTED TRANSACTION FOR EDITING
  app.openTx = function() {
	app.tx=app.transactions[app.txIndex];
	console.log("transaction date: "+app.tx.date);
	console.log("open transaction: "+app.txIndex+"; "+app.tx.text);
	// if(app.tx.transfer==null) app.tx.transfer="none"; // ****** TEMPORARY FIX *****
	app.toggleDialog('txDialog',true);
	id('txAccountChooser').selectedIndex=app.accountNames.indexOf(app.tx.account);
	id('txCheckbox').checked=app.tx.checked;
	id('txDateField').value=app.tx.date.substr(0,10);
	id('txAmountField').value=pp(app.tx.amount);
	id('txTextField').value=app.tx.text;
	id('txBalance').innerHTML=pp(app.tx.balance);
	id('txBalance').style.color=(app.tx.balance<0)?'red':'black';
	var i=0;
	while(id('txTransferChooser').options[i].text!=app.tx.transfer) i++;
	id('txTransferChooser').selectedIndex=i;
	id('txMonthly').checked=app.tx.monthly;
	id('buttonDeleteTx').disabled=false;
	id('txSign').innerHTML=(app.tx.amount<0)?"-":"+";
	if(app.tx.text=="B/F") { // can only change date or amount of earliest B/F item
		console.log("limit edits");
		id('txAccountChooser').disabled=true;
		id('txDateField').disabled=true;
		id('txTextField').disabled=true;
		id('txTransferChooser').disabled=true;
		id('txMonthly').disabled=true;
		id('buttonDeleteTx').style.color='gray';
		id('buttonDeleteTx').disabled=true;
	}
	else {
		console.log("full editing");
		id('txAccountChooser').disabled=false;
		id('txDateField').disabled=false;
		id('txTextField').disabled=false;
		id('txTransferChooser').disabled=false;
		id('txMonthly').disabled=false;
		id('buttonDeleteTx').disabled=false;
		id('buttonDeleteTx').style.color='red';
	}
  }
  
  // LIST ACCOUNTS
  app.listAccounts = function() {
	  console.log("list "+app.accounts.length+" accounts")
  	  var item = null;
	  id('list').innerHTML="";
	  var html="Accounts";
	  if(app.accounts.length>0) {
	  	app.accounts.sort(function(a,b) { return (a.name>b.name)?1:-1}); //alpha-sort on account names
		console.log("accounts sorted - first: "+app.accounts[0].name);
		while (id('txAccountChooser').options.length>0)  id('txAccountChooser').options.remove(0);  // clear account lists
		while (id('txTransferChooser').options.length>0)  id('txTransferChooser').options.remove(0);
		app.accountNames=[];
		app.grandTotal=0;
		var ac=document.createElement('option');
		ac.text="none";
		ac.index=0;
		id('txTransferChooser').options.add(ac);
		for(var i in app.accounts) {
			app.accountNames.push(app.accounts[i].name);
			app.grandTotal+=parseInt(app.accounts[i].balance);
			var listItem = document.createElement('li'); // add account to accounts list...
			listItem.index=i;
	  		listItem.classList.add('list-item');
			html="<b>"+app.accounts[i].name+"</b>";
			if(app.accounts[i].balance<0) html+="<span class='amount-red'>"; else html+="<span class='amount'>";
			html+=pp(app.accounts[i].balance)+"</span>";
			listItem.innerHTML=html;
			listItem.addEventListener('click', function(){app.acIndex=this.index; app.openAccount();});
			id('list').appendChild(listItem);
			ac=document.createElement('option'); // ...and to account chooser...
			ac.index=i;
			ac.text=app.accounts[i].name;
			id('txAccountChooser').options.add(ac);
			// id('txAccountOptions').options.add(ac);
			ac=document.createElement('option'); // ...and transfer chooser
			ac.index=i+1;
			ac.text=app.accounts[i].name;
			id('txTransferChooser').options.add(ac);
	  	}
	  	console.log("transfer option 0: "+id('txTransferChooser').options[0].text);
		html="Accounts <i>"+pp(app.grandTotal)+"</i>";
	  }
	  id('heading').innerHTML=html;
  }
  
  // OPEN ACCOUNT
  app.openAccount = function() {
  	app.account=app.accounts[app.acIndex];
	console.log("open account #"+app.acIndex+": "+app.account.name);
	app.transactions = [];
	var dbTransaction = app.db.transaction('transactions',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore = dbTransaction.objectStore('transactions');
	console.log("indexedDB objectStore ready");
	var request = dbObjectStore.openCursor();
	request.onsuccess = function(event) {
		var cursor = event.target.result;
    		if (cursor) {
				if(cursor.value.account==app.account.name) {
					app.transactions.push(cursor.value);
					console.log("transaction "+cursor.key+", id: "+cursor.value.id+", date: "+cursor.value.date+", "+cursor.value.amount+" pence, monthly:"+cursor.value.monthly);
				}
				cursor.continue();
    			}
			else {
				console.log(app.transactions.length+" account transactions");
    				app.transactions.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); //chronological order
	  			if(app.transactions.length>50) { // limit each account to latest 50 transactions}
					console.log(">50 transactions - deleting earliest");
					app.transactions[1].amount+=app.transactions[0].amount; // create new B/F item for account
					app.transactions[1].text="B/F";
					request = dbObjectStore.put(app.transactions[1]); // update transaction in database
					request.onsuccess = function(event)  {console.log("new B/F transaction  updated");};
					request.onerror = function(event) {console.log("error updatingnew B/F transaction");};
					request = dbObjectStore.delete(app.transactions[0].id);
					request.onsuccess = function(event) {
						app.transactions.shift();
						console.log("earliest transaction deleted");
						app.buildTransactionsList();
					};
					request.onerror = function(event) {console.log("error deleting earliest transaction");};
	  			}
				else app.buildTransactionsList();
			};
		};
  }
  
  // LIST ACCOUNT TRANSACTIONS
  app.buildTransactionsList = function() {
	 var item = null;
	 id('list').innerHTML="";
	 var html="";
	 var tx={};
	 var d="";
	 var mon=0;
	 var balance=0;
	 notify("list "+app.transactions.length+" transactions");
	 for(var i in app.transactions) {
		balance+=app.transactions[i].amount;
		app.transactions[i].balance=balance; // save balance after each transaction in account
	 }
	 for(var i = app.transactions.length-1;i>=0;i--) { // latest at top
		var listItem = document.createElement('li');
		listItem.index=i;
	  	listItem.classList.add('list-item');
		tx=app.transactions[i];
		d=tx.date;
		notify("date: "+d);
		mon=parseInt(d.substr(5,2))-1;
		mon*=3;
		d=d.substr(8,2)+" "+app.months.substr(mon,3); // +" "+d.substr(2,2);
		html="<span class='date'>"+d+"</span> "+trim(tx.text,15);
		if(tx.amount<0) html+="<span class='amount-red'>"; else html+="<span class='amount'>";
		html+=pp(tx.amount);
		html+=" <input type='checkbox'"+(tx.checked?" checked='checked' />":"/>");
		html+="</span>";
		listItem.innerHTML=html;
		listItem.addEventListener('click', function(){app.txIndex=this.index; app.openTx();});
		id('list').appendChild(listItem);
	 }
	 app.accounts[app.acIndex].balance=balance;
	 html=trim(app.account.name,12)+" <i>";
	 if(balance<0) html+=" -"; else html+=" ";
	 html+=pp(balance)+"</i>";
	 id('heading').innerHTML=html;
	 id("buttonBack").style.display="block";
  }
    
  // START-UP CODE
  notify("START");
  
  var request = window.indexedDB.open("moneyDB");
	request.onerror = function(event) {
		alert("indexedDB error");
	};
	request.onsuccess = function(event) {
		// console.log("request: "+request);
		app.db=event.target.result;
		notify("DB open");
		var dbTransaction = app.db.transaction('transactions',"readwrite");
		// was - var transaction = db.transaction('petrol',window.IDBTransaction.READ_WRITE);
		notify("indexedDB transaction ready");
		var dbObjectStore = dbTransaction.objectStore('transactions');
		notify("indexedDB objectStore ready");
		app.transactions=[];
		notify("transactions array ready");
		var request = dbObjectStore.openCursor();
		request.onsuccess = function(event) {
			var cursor = event.target.result;
    			if (cursor) {
					if(cursor.value.repeat) { // temporary code to get rid of repeats
						console.log("remove repeat");
						cursor.value.repeat=null;
					}
					app.transactions.push(cursor.value);
					// console.log("transaction "+cursor.key+", id: "+cursor.value.id+", date: "+cursor.value.date+", "+cursor.value.amount+" pence");
					cursor.continue();
    			}
			else {
				notify("No more entries!");
				notify(app.transactions.length+" transactions");
    			app.transactions.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); //chronological order
   				app.accounts=[];
    			var acNames=[];
    			var acBalances=[];
    			var n=0;
    			for(var i in app.transactions) { // build list of accounts
    				// IF TRANSACTION .monthly IS TRUE AND DATE IS >= 1 MONTH BEFORE TODAY CREATE REPEAT TRANSACTION WITH .monthly TRUE AND SET .monthly TO FALSE
    				var today=new Date();
    				var months=today.getFullYear()*12+today.getMonth()+1; // months count
    				today=today.getDate();
    				// FIX INVALID DATES
    				var d=app.transactions[i].date;
    				notify('date '+i+':'+d);
    				if(Number.isNaN(Date.parse(d))) {
    					notify('FIX DATE');
    					d=Math.floor(months/12).toString()+"-";
    					months%=12;
    					if(months<10) d+='0';
    					d+=months.toString()+"-"+today;
    					notify('new date: '+d);
    					app.transactions[i].date=d;
    					var request=dbObjectStore.put(app.transactions[i]); // update transaction in database
						request.onsuccess = function(event)  {
							notify("transaction update with date fixed "+app.transactions[i].id);
						};
						request.onerror = function(event) {notify("error updating fixed date: "+request.error);};
    				}
    				// END OF DATE FIX
    				if(app.transactions[i].monthly) {
    					notify("monthly repeat check");
    					var txDate=app.transactions[i].date; // YYYY-MM-DD
    					var txMonths=parseInt(txDate.substr(0,4))*12+parseInt(txDate.substr(5,2)); // months count
    					var txDay=txDate.substr(8,2);
    					notify("months:"+months+" txMonths:"+txMonths+" monthly:"+app.transactions[i].monthly);
    					if((((months-txMonths)>1))||(((months-txMonths)==1)&&(today>=txDay))) { // one month or more later
    						notify("add repeat transaction for "+app.transactions[i].text);
    						app.transactions[i].monthly=false; // cancel monthly repeat
    						// put amended transaction in indexedDB
							var request=dbObjectStore.put(app.transactions[i]); // update transaction in database
							request.onsuccess = function(event)  {
								notify("transaction updated - monthly: false "+app.transactions[i].id);
							};
							request.onerror = function(event) {
								notify("error updating transfer/monthly: "+request.error);
							};
    						var tx={}; // create repeat transaction
    						tx.account=app.transactions[i].account;
    						txMonths+=1; // next month (could be next year too)
    						// try new way of setting date
    						// var isoDate=
    						tx.date=Math.floor(txMonths/12).toString()+"-";
    						txMonths%=12;
    						if(txMonths<10) tx.date+='0'; // isoDate+="0";
    						// isoDate+=
    						tx.date+=txMonths.toString()+"-"+txDay;
    						// tx.date=new Date(isoDate);
    						// tx.date+="-"+parseInt(txMonths%12)+"-"+txDay;
    						notify("monthly transaction date: "+txDate+"; repeat: "+tx.date);
    						tx.amount=app.transactions[i].amount;
    						tx.checked=false;
    						tx.text=app.transactions[i].text;
    						tx.transfer=app.transactions[i].transfer;
    						tx.monthly=true;
    						// put new repeat transaction in indexedDB
    						request = dbObjectStore.add(tx);  // add new transaction to database
							request.onsuccess = function(event) {
								console.log("new repeat transaction added");
								if(tx.transfer!='none') { // reciprocal transactions repeats too
									tx.text=tx.account;
									tx.account=tx.transfer;
									tx.transfer='none';
									tx.amount=-1*tx.amount;
									tx.monthly=false;
									request = dbObjectStore.add(tx);  // add new transaction to database
									request.onsuccess = function(event) {
										notify("new repeated reciprocal transaction added");
									}
								};
							};
							request.onerror = function(event) {
								notify("error adding new repeat transaction: "+request.error);
							};
    					}
    				}
g    				// END OF REPEAT TRANSACTION CODE
  	  				n=acNames.indexOf(app.transactions[i].account);
	  				if(n<0) {
	  					console.log("add account "+app.transactions[i].account);
	  	  				acNames.push(app.transactions[i].account);
		  				acBalances.push(app.transactions[i].amount);
	  				}
	  				else acBalances[n]+=app.transactions[i].amount;
    			}
				for(n in acNames) {
  					app.accounts.push({name: acNames[n], balance: acBalances[n]});
  				}
  				notify(app.accounts.length+" accounts");
				app.listAccounts();
			};
		};
	};
	request.onupgradeneeded = function(event) {
		var dbObjectStore = event.currentTarget.result.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
		console.log("database ready");
	};

  // implement service worker if browser is PWA friendly
  if (navigator.serviceWorker.controller) {
  console.log('Active service worker found, no need to register')
} else { // Register the ServiceWorker
  navigator.serviceWorker.register('accountsSW.js', {
			scope: '/Accounts/'
		}).then(function(reg) {
    console.log('Service worker has been registered for scope:'+ reg.scope);
  });
}
  
})();

