import { Fade } from 'react-awesome-reveal';

import React from 'react';
import ColeImage from '../../assets/images/Cole.jpeg';
import EverettImage from '../../assets/images/Everett.jpeg';
import KennyImage from '../../assets/images/Kenny_ISU.jpg';
import MelaniImage from '../../assets/images/Melani.jpg';
import KokottImage from '../../assets/images/Kokott.jpg';
import SamImage from '../../assets/images/Sam.jpg';

import './About.css';


const About: React.FC = () => {
    return (
        <Fade>
        <main  className="text-center">
            <div className="container">
                <div className="row">
                    <br />
                    <h2>Senior Design Team sdmay25-21 • Distributing a Fleet of Drones Over an Area With No-Fly Zones</h2>
                    <h2>Project Overview</h2>
                    <p>
                        Typically, when a fleet of drones is employed for various surveillance purposes and/or search-and-rescue
                        missions over a given area, one of the crucial aspects is to ensure that the response time is as bounded
                        as possible for every point within that geo-area. However, in many practical scenarios, there are obstacles
                        (a.k.a. "no-fly" zones) due to various constraints (e.g., tall buildings in urban settings; proximity of
                        airports; military installations; protected eco-zones; etc.)—which need to be taken into account when
                        considering the needed flight time to ensure observational coverage.
                    </p>
                    <p>
                        The main goal of this project is to implement algorithms for partitioning a given geo-area into zones with
                        awareness of no-fly polygonal obstacles. The objective is to develop a prototype system that will enable
                        visualization of the partitioning and show a sample of a drone's flight for a given location of interest
                        and the starting position of the drone.
                    </p>
                </div>
                <div className="row">
                    <div className="col-12 text-left">
                        <div className="section-title">
                            <h3 className="title">Team Members</h3>
                        </div>
                    </div>
                </div>
                <div className="row">
                      {[
                        { name: "Cole Stuedeman", role: "Testing", img: ColeImage, major: "Senior in Software Engineering" },
                        { name: "Everett Duffy", role: "Design", img: EverettImage, major: "Senior in Computer Engineering" },
                        { name: "Kenneth Schueman", role: "Client Interaction", img: KennyImage, major: "Senior in Software Engineering" },
                        { name: "Melani Hodge", role: "Design", img: MelaniImage, major: "Senior in Software Engineering" },
                        { name: "Nicholas Kokott", role: "Team Lead", img: KokottImage, major: "Senior in Software Engineering" },
                        { name: "Samuel Russett", role: "Research", img: SamImage, major: "Senior in Software Engineering" }
                    ].map(member => (
                        <div className="col-lg-2 col-md-2 col-sm-3" key={member.name}>
                            <div className="text-center">
                                <h4 className="title">{member.name}</h4>
                                <small className="text-muted">{member.role}</small>
                                <img src={member.img} className="img-responsive" alt={member.name} />
                            </div>
                            <div className="col-sm-12">
                                <p>{member.major}</p>
                            </div>
                        </div>
                    ))}
                </div>
                {/* <h2 id="weeklyreports">Weekly Reports</h2>
                {[...Array(10).keys()].map(i => (
                    <div key={i}>
                        <a href={`Reports/Report%20${i + 1}.pdf`}>Report {i + 1}</a>
                        <br />
                    </div>
                ))}
                <h2 id="lightningtalks">Lightning Talks</h2>
                {[
                    "Product Research",
                    "Problem and Users",
                    "User Needs and Requirements",
                    "Project Planning",
                    "Detailed Design",
                    "Contextualization + Design Check-In",
                    "Prototyping",
                    "Ethics and Professional Responsibility"
                ].map((topic, index) => (
                    <div key={index}>
                        <a href={`Lightning%20Talks/Lightning%20Talk%20${index + 1}_%20${topic.replace(/ /g, '%20')}.pdf`}>
                            Lightning Talk {index + 1}: {topic}
                        </a>
                        <br />
                    </div>
                ))}
                <h2 id="designdocument">Design Document</h2>
                <a href="Final%20Design%20Document.pdf">Final Design Document</a> */}
            </div> 
        </main>
        </Fade>
    );
};

export default About;