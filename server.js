const express = require('express');
const http = require('http');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cors = require('cors');


const app = express();
const server = http.createServer(app);
const bot = new TelegramBot('6931081448:AAFz0kXyNlWd6hcjCGNzLZCjO5IRv_A4HOE');

const telegramResponseTpl = "نام و نام خانوادگی: $name\nشماره تماس: $mobile\nمتن پیام: $msg\n";

const ttl = 1 * 60;
let ipMap = new Map();

const setIpWithTTL = (ip) => {
    ipMap.set(ip, Date.now() + ttl * 1000);
};

const isIpExpired = (ip) => {
    ipMap = new Map([...ipMap].filter(([, time]) => Date.now() < time));
    const ipTime = ipMap.get(ip);
    return !ipTime;
};

function convertToIranFormat(mobileNumber) {
    if (!mobileNumber) return false;

    mobileNumber = mobileNumber.replace(/\D/g, '');

    if (mobileNumber.startsWith('09')) {
        return '98' + mobileNumber.slice(1);
    }
    else if (mobileNumber.startsWith('989')) {
        return mobileNumber;
    }
    else if (mobileNumber.startsWith('+989')) {
        return mobileNumber.slice(1);
    }
    else {
        return false;
    }
}

const sendSms = (data) => {
    const url = 'https://send-sms.liara.run/send-message';

    axios.get(url, {
        params: data
    })
    .then(response => console.log(response.data))
    .catch(error => console.error('Error on sendSms:', error));
}

app.use(cors({
    origin: '*'
}));

app.get('/send-message', (req, res) => {
    const clientIp = req.ip;

    if (isIpExpired(clientIp)) {
        setIpWithTTL(clientIp);
        const chatId = "-1001936062958";
        const data = req.query;
        const message = telegramResponseTpl.replace('$name', data.name).replace('$mobile', data.mobile).replace('$msg', data.message);

        bot.sendMessage(chatId, message)
            .then(() => {
                const fomattedNumber = convertToIranFormat(data.mobile);

                if (fomattedNumber) {
                    const welcomeMsg = `${data.name} عزیز، پیام شما با موفقیت دریافت شد و پس از بررسی توسط تیم حرفه ای مون لاین با شما تماس گرفته خواهد شد. \n\n باتشکر`;
                    sendSms({number:fomattedNumber, msg:welcomeMsg});
                }
                res.send('Message sent successfully');
                
            })
            .catch((error) => {
                res.status(500).send('Error sending message: ' + error.message);
            });
    }
    else
    {
        res.status(429).send('Please Try Later');
    }
});

const PORT = 4000;

server.listen(PORT, () => console.log(`Server Start On Port ${PORT}`));
