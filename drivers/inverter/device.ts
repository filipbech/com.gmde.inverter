import Homey from 'homey';
const http = require('http.min')

const refreshrate = 1000 * 60 * 5; // 5 min in ms

class MyDevice extends Homey.Device {
  timerId!: NodeJS.Timeout;
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

  async getInverterData() {
    const response = await this.request(`http://xd.lewei50.com/api/v1/site/inverterList/${this.homey.settings.get('customerId')}?lang=en`).catch(this.error);
    const dictionary = response.data.find((inverter:any)=>inverter.id==this.homey.settings.get('deviceId')).dataDict;
    await this.setCapabilityValue('measure_power', +dictionary.find((data:any)=>data.key==='DQGL').value).catch(this.error);
    await this.setCapabilityValue('measure_customtemperature', +dictionary.find((data:any)=>data.key==='SRQWD').value).catch(this.error);
    await this.setCapabilityValue('measure_power.2', +dictionary.find((data:any)=>data.key==='FEEDINPOWER').value).catch(this.error);
    await this.setCapabilityValue('measure_power.3', +dictionary.find((data:any)=>data.key==='FZGL').value).catch(this.error);
    // this.log('Inverter data updated');
  }
  async getBatteryData() {
    const response = await this.request(`http://xd.lewei50.com/api/v1/site/BatteryList/${this.homey.settings.get('customerId')}?lang=en`).catch(this.error);
    const dictionary = response.data.find((inverter:any)=>inverter.id==this.homey.settings.get('deviceId')).batList[0].dataDict;
    await this.setCapabilityValue('measure_custombattery.5', +dictionary.find((data:any)=>data.key==='B1_3').value).catch(this.error);
    await this.setCapabilityValue('measure_custombattery.6', +dictionary.find((data:any)=>data.key==='B1_6').value).catch(this.error);
    await this.setCapabilityValue('measure_custombattery.7', +dictionary.find((data:any)=>data.key==='B1_8').value).catch(this.error);
    await this.setCapabilityValue('measure_custombattery.8', +dictionary.find((data:any)=>data.key==='B1_10').value).catch(this.error);
    // this.log('battery data updated');
  }

  async tick() {
    // this.log('tick');
    try {
      await this.getInverterData();
      await this.getBatteryData();
      this.timerId = setTimeout(this.tick.bind(this), refreshrate); 
    } catch(e) {
      try {
        // this.log('failed to get data - unavailable OR un-authenticated');
        await this.authenticate();
        this.tick();
      } catch(err) {
        // this.log('failed to authenticated');
        this.timerId = setTimeout(this.tick.bind(this), refreshrate); 
      }
    }
  }

  async onInit() {

    try {
      //inverter capabilities
      await this.addCapability('measure_power');
      await this.setCapabilityOptions("measure_power", {title:'Power Now'})
      await this.addCapability('measure_custombattery.8');
      await this.setCapabilityOptions("measure_custombattery.8", {title:'SOC', units:'%'}) 
      await this.addCapability('measure_power.2');
      await this.setCapabilityOptions("measure_power.2", {title:'Grid Power'})
      await this.addCapability('measure_power.3');
      await this.setCapabilityOptions("measure_power.3", {title:'Load Power'})    

      // //battery capabilities
      await this.addCapability('measure_custombattery.5');
      await this.setCapabilityOptions("measure_custombattery.5", {title:'Battery Power'})
      await this.addCapability('measure_customtemperature');
      await this.setCapabilityOptions("measure_customtemperature", {title:'Radiator temperature'})
      await this.addCapability('measure_custombattery.6');
      await this.setCapabilityOptions("measure_custombattery.6", {title:'High voltage', units:'mV'})
      await this.addCapability('measure_custombattery.7');
      await this.setCapabilityOptions("measure_custombattery.7", {title:'Low voltage', units:'mV'})    


      await this.addCapability('button');
      await this.setCapabilityOptions("button", {title:'Refresh'})
      this.registerCapabilityListener('button', (value, opts) => {
        clearTimeout(this.timerId);
        this.tick();
      })   

      

      // start data fetching
      this.tick();

    } catch(e) {
      this.error(e);
    }
    
  }

}

module.exports = MyDevice;
