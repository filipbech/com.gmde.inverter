import Homey from 'homey';
const http = require('http.min')

const refreshrate = 1000 * 60 * 1; // 1 min in ms

class MyDevice extends Homey.Device {

  token!:string;
  async authenticate() {
    return http.json(`http://xd.lewei50.com/api/v1/user/Login?lang=en&username=${this.homey.settings.get('username')}&password=${this.homey.settings.get('password')}`)
      .then((response: any) => {
        this.token = response.data.token;
        return 'ok'
      })
      .catch(this.error);    
  }
  
  async request(url:string) {
    return http.json(`${url}&token=${this.token}`);
  }

  invertData = {
    FEEDINPOWER:0,
    FZGL:0,
    DQGL:0,
    SRQWD:0
  };
  batteryData = {
    B1_3:0,
    B1_6:0,
    B1_8:0,
    B1_10:0
  };    

  async getInverterData() {
    const response = await this.request(`http://xd.lewei50.com/api/v1/site/inverterList/${this.homey.settings.get('customerId')}?lang=en`);
    this.log(response);
    const dictionary = response.data.find((inverter:any)=>inverter.id===this.homey.settings.get('deviceId')).dataDict;
    this.invertData.FEEDINPOWER = dictionary.find((data:any)=>data.key==='FEEDINPOWER').value;
    this.invertData.FZGL = dictionary.find((data:any)=>data.key==='FZGL').value;
    this.invertData.DQGL = dictionary.find((data:any)=>data.key==='DQGL').value;
    this.invertData.SRQWD = dictionary.find((data:any)=>data.key==='SRQWD').value;
  }
  async getBatteryData() {
    const response = await this.request(`http://xd.lewei50.com/api/v1/site/BatteryList/${this.homey.settings.get('customerId')}?lang=en`);
    this.log(response);
    const dictionary = response.data.find((inverter:any)=>inverter.id===this.homey.settings.get('deviceId')).batList[0].dataDict;
    this.batteryData.B1_3 = dictionary.find((data:any)=>data.key==='B1_3').value;
    this.batteryData.B1_6 = dictionary.find((data:any)=>data.key==='B1_6').value;
    this.batteryData.B1_8 = dictionary.find((data:any)=>data.key==='B1_8').value;
    this.batteryData.B1_10 = dictionary.find((data:any)=>data.key==='B1_10').value;
  }


  tick() {
    // setTimeout(this.tick.bind(this), refreshrate);

    /*
     TODO
     - refresh cycle
     - settings for customerId, deviceId
     - re-try
     - Re-authenticate
     - view
     - publish
     
    */

  }


  async onInit() {
    this.log('MyDevice has been initialized!');

    await this.authenticate();

    await this.getInverterData();
    await this.getBatteryData();

    this.log(this.token, this.batteryData, this.invertData);
  }


}

module.exports = MyDevice;
