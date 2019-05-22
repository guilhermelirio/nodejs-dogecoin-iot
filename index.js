var W3CWebSocket = require('websocket').w3cwebsocket;
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const PORT = process.env.PORT || 3000
const axios = require('axios');

//Valor por minuto
var costForMinute = 0.10;
//Variável do valor do dólar hoje
var dolarNow = "";
//Variável do valor depositado
var valueDeposit = "";

//URL da API de preços do Dogecoin
var url = "https://api.coinmarketcap.com/v1/ticker/dogecoin/"; 

//Rota do servidor
app.get('/', function(req, res){
  res.send(`Servidor iniciado com sucesso na porta ${PORT}`);
});

//Função para formatar valor
function formatNumber(num){
	return num.toString().replace(/(\d)(?=(\d{2})+(?!\d))/g, '$1,').replace(",",".");
}

//Função de verificação de pagamento
async function verifyPayment(amount, txid) {
  try {
    const response = await axios.get('https://api.coinmarketcap.com/v1/ticker/dogecoin/');
    
    //Captura o preco do dolar hoje
    dolarNow = response.data[0].price_usd;

    //Trasforma em dolar o valor pago em Dogecoin
    valueDeposit = (parseFloat(formatNumber(amount)) * dolarNow).toFixed(2);

    //Calcula o valor pago em segundos.
	var calculo = Math.round(valueDeposit * 60 / costForMinute);
	console.log(`Pagamento recebido: $${valueDeposit}`);
	console.log(`Tempo adquirido: ${calculo} segundos.`);

	//Transforma o tempo em milisegundos.
	var timeBought = Math.round(calculo * 1000);
	console.log(`Tempo convertido (ms) e enviado para o ESP8266: ${timeBought} milisegundos`)

	//Envia para o esp8266 via socket.
	io.emit('paid_out_esp', {"timeBought": timeBought})
	setTimeout(function(){
		io.emit('paid_out', {"amount":amount, "txid":txid})
	},500);		

  } catch (error) {
    console.error(error);
  }
}

//Função de iniciar o websocket client.
function startWebsocket() {
	var client = new W3CWebSocket('wss://ws.dogechain.info/inv');

	client.onerror = function() {
		console.log('Connection Error');
	};

	//Envia para a API o endereço a ser "vigiado"
	client.onopen = function() {
		console.log('WebSocket Client Connected');
		client.send(JSON.stringify({"op":"addr_sub", "addr":"DBurLx1z9jKTK1gXyoWG9EH65euaZza8B6"}));		
	};

	//Caso a conexão se fechar, é reaberta.
	client.onclose = function() {
		console.log('echo-protocol Client Closed');
		client = null
		setTimeout(startWebsocket, 5000)
	};


	//Quando receber alguma mensagem da API, é tratada.
	client.onmessage = function(onmsg) {
		var response = JSON.parse(onmsg.data);

		if(response.op == "utx"){
			var getOuts = response.x.outputs;
			var countOuts = getOuts.length;
			var txid = response.x.hash;

			for(i = 0; i < countOuts; i++){
				var outAdd = response.x.outputs[i].addr;
				var address = "DBurLx1z9jKTK1gXyoWG9EH65euaZza8B6";
				if(outAdd == address){				
					var amount = response.x.outputs[i].value;
					console.log('Dogecoins Recebidas: '+amount);
					console.log('TxId: '+txid);
					var calAmount = amount / 100000000;
					verifyPayment(calAmount, txid);
				};
			};
		}

	};

	//Exibe no console quando algum client (nodeMCU) se conectar.
	io.on("connection", function (user) {
		console.log(`Usuário conectado: ${user.id}`)
		user.emit('conectado');
	})

}

//Inicia o Websocke client (aguarda transações no endereço)
startWebsocket();


//Inicia o servidor socket.io
http.listen(PORT, () =>{
    console.log(`Servidor iniciado com sucesso na porta ${PORT}`)
})