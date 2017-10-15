var exports = module.exports = {};

var nodemailer = require("nodemailer");

exports.send_email = function({receivers, subject, body}, callback){
  let bind = {};
  let smtpConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // upgrade later with STARTTLS
      auth: {
          user: 'avadheshbhatt92@gmail.com',
          pass: 'Vimla67@'
      }
  };
  let transporter = nodemailer.createTransport(smtpConfig);
  receivers = receivers.join(', ');
  let mailOptions = {
      //from: '"Fred Foo 👻" <foo@blurdybloop.com>', // sender address
      to: receivers, // list of receivers
      subject: subject, // Subject line
      //text: 'Hello world?', // plain text body
      html: body // html body
  };

  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        bind.status = 0;
        bind.message = 'Oops! error occured while sending email';
        bind.error = error;
      } else{
        bind.status = 1;
        bind.message = 'Email was sent successfully';
        bind.data = info;
      }
      callback(bind)
      return res.json('Message sent: %s', info.messageId);
  });

}
